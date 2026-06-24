/**
 * Enrollment data-access layer.
 *
 * All Firestore reads/writes for the `enrollments`, `meta/counters` and
 * `dupKeys` collections live here. The browser talks directly to Firestore;
 * security is enforced by firestore.rules (no backend server — see §6 of the
 * requirement doc).
 */
import {
  collection,
  doc,
  getCountFromServer,
  getDoc,
  getDocs,
  limit as fbLimit,
  orderBy,
  query,
  QueryConstraint,
  runTransaction,
  serverTimestamp,
  startAfter,
  Timestamp,
  updateDoc,
  where,
  type DocumentData,
  type QueryDocumentSnapshot,
} from 'firebase/firestore';
import { db, blockDuplicates } from './firebase';
import { normalizePhone } from './format';
import { PROGRAM_OPTIONS } from '@/config/formSchema';
import type { Enrollment, EnrollmentStatus } from '@/types/enrollment';

const ENROLLMENTS = 'enrollments';
const PAGE_SIZE = 25;

export class DuplicateEnrollmentError extends Error {
  constructor(field: 'email' | 'phone') {
    super(
      field === 'email'
        ? 'An enrollment with this email already exists.'
        : 'An enrollment with this phone number already exists.',
    );
    this.name = 'DuplicateEnrollmentError';
  }
}

export interface EnrollmentFilters {
  program?: string;
  status?: EnrollmentStatus | '';
  dateFrom?: string; // YYYY-MM-DD
  dateTo?: string; // YYYY-MM-DD
  search?: string;
}

export interface EnrollmentInput {
  fullName: string;
  email: string;
  phone: string;
  dob?: string;
  gender?: string;
  program: string;
  source?: string;
  address?: { line1?: string; city?: string; state?: string; zip?: string };
}

// ── Mapping ────────────────────────────────────────────────────────────────

function toEnrollment(snap: QueryDocumentSnapshot<DocumentData>): Enrollment {
  const data = snap.data();
  const ts = data.createdAt as Timestamp | null;
  return {
    id: snap.id,
    enrollmentId: data.enrollmentId,
    fullName: data.fullName,
    email: data.email,
    phone: data.phone,
    dob: data.dob,
    gender: data.gender,
    program: data.program,
    source: data.source,
    address: data.address,
    status: data.status,
    createdDate: data.createdDate,
    emailLower: data.emailLower,
    dupKey: data.dupKey,
    createdAt: ts ? ts.toDate() : null,
  };
}

// ── Create (with sequential ID + duplicate guard) ───────────────────────────

const yearOf = (date: Date) => date.getUTCFullYear();

/** Build a YYYY-MM-DD string in UTC (NFR-6: store in UTC). */
function utcDateString(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function dupKeyRef(kind: 'email' | 'phone', value: string) {
  // Firestore doc ids cannot contain '/'. email/phone never do once normalised.
  return doc(db, 'dupKeys', `${kind}:${value}`);
}

/**
 * Creates an enrollment in a single transaction:
 *   1. (optional) verify email/phone not already used
 *   2. atomically increment meta/counters.enrollmentSeq
 *   3. mint enrollmentId  ENR-<year>-<seq:5>
 *   4. write the enrollment + duplicate-guard markers
 *
 * Returns the generated human-readable enrollmentId.
 */
export async function createEnrollment(input: EnrollmentInput): Promise<string> {
  const emailLower = input.email.trim().toLowerCase();
  const phoneNorm = normalizePhone(input.phone);

  const counterRef = doc(db, 'meta', 'counters');
  const emailMarker = dupKeyRef('email', emailLower);
  const phoneMarker = dupKeyRef('phone', phoneNorm);
  const enrollmentRef = doc(collection(db, ENROLLMENTS));

  const enrollmentId = await runTransaction(db, async (tx) => {
    // ---- all reads first ----
    const counterSnap = await tx.get(counterRef);

    if (blockDuplicates) {
      const [emailSnap, phoneSnap] = await Promise.all([
        tx.get(emailMarker),
        tx.get(phoneMarker),
      ]);
      if (emailSnap.exists()) throw new DuplicateEnrollmentError('email');
      if (phoneSnap.exists()) throw new DuplicateEnrollmentError('phone');
    }

    // ---- compute next sequence ----
    const now = new Date();
    const year = yearOf(now);
    const prevSeq = counterSnap.exists()
      ? (counterSnap.data().enrollmentSeq as number) ?? 0
      : 0;
    const nextSeq = prevSeq + 1;
    const humanId = `ENR-${year}-${String(nextSeq).padStart(5, '0')}`;

    // ---- writes ----
    tx.set(counterRef, { enrollmentSeq: nextSeq, year }, { merge: true });

    tx.set(enrollmentRef, {
      enrollmentId: humanId,
      fullName: input.fullName.trim(),
      email: input.email.trim(),
      emailLower,
      phone: input.phone.trim(),
      dob: input.dob ?? '',
      gender: input.gender ?? '',
      program: input.program,
      source: input.source ?? '',
      address: input.address ?? {},
      status: 'new',
      dupKey: `${emailLower}|${phoneNorm}`,
      createdAt: serverTimestamp(),
      createdDate: utcDateString(new Date()),
    });

    if (blockDuplicates) {
      tx.set(emailMarker, { ref: enrollmentRef.id });
      tx.set(phoneMarker, { ref: enrollmentRef.id });
    }

    return humanId;
  });

  return enrollmentId;
}

// ── Queries (admin) ─────────────────────────────────────────────────────────

function baseConstraints(filters: EnrollmentFilters): QueryConstraint[] {
  const constraints: QueryConstraint[] = [];
  if (filters.program) constraints.push(where('program', '==', filters.program));
  if (filters.status) constraints.push(where('status', '==', filters.status));
  return constraints;
}

function matchesClientFilters(e: Enrollment, filters: EnrollmentFilters): boolean {
  if (filters.dateFrom && e.createdDate < filters.dateFrom) return false;
  if (filters.dateTo && e.createdDate > filters.dateTo) return false;
  if (filters.search) {
    const q = filters.search.trim().toLowerCase();
    const haystack = [e.fullName, e.email, e.phone, e.enrollmentId]
      .join(' ')
      .toLowerCase();
    if (!haystack.includes(q)) return false;
  }
  return true;
}

export interface PageResult {
  rows: Enrollment[];
  cursor: QueryDocumentSnapshot<DocumentData> | null;
  hasMore: boolean;
}

/**
 * Cursor-based pagination for the plain (no date/search) case.
 * Equality filters run server-side; ordered by createdAt desc.
 */
export async function fetchEnrollmentsPage(
  filters: EnrollmentFilters,
  cursor: QueryDocumentSnapshot<DocumentData> | null,
  pageSize = PAGE_SIZE,
): Promise<PageResult> {
  const constraints = [
    ...baseConstraints(filters),
    orderBy('createdAt', 'desc'),
    ...(cursor ? [startAfter(cursor)] : []),
    fbLimit(pageSize + 1),
  ];
  const snap = await getDocs(query(collection(db, ENROLLMENTS), ...constraints));
  const docs = snap.docs;
  const hasMore = docs.length > pageSize;
  const pageDocs = hasMore ? docs.slice(0, pageSize) : docs;
  return {
    rows: pageDocs.map(toEnrollment),
    cursor: pageDocs.length ? pageDocs[pageDocs.length - 1] : null,
    hasMore,
  };
}

/**
 * Fetches all records matching the equality filters (up to `max`), then
 * applies date-range + search client-side. Used for export and for global
 * search where Firestore's lack of full-text search needs a client pass.
 */
export async function fetchAllEnrollments(
  filters: EnrollmentFilters,
  max = 5000,
): Promise<Enrollment[]> {
  const results: Enrollment[] = [];
  let cursor: QueryDocumentSnapshot<DocumentData> | null = null;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const constraints: QueryConstraint[] = [
      ...baseConstraints(filters),
      orderBy('createdAt', 'desc'),
      ...(cursor ? [startAfter(cursor)] : []),
      fbLimit(500),
    ];
    const snap = await getDocs(query(collection(db, ENROLLMENTS), ...constraints));
    if (snap.empty) break;
    snap.docs.forEach((d) => results.push(toEnrollment(d)));
    cursor = snap.docs[snap.docs.length - 1];
    if (snap.docs.length < 500 || results.length >= max) break;
  }
  return results.filter((e) => matchesClientFilters(e, filters));
}

export async function getEnrollmentById(id: string): Promise<Enrollment | null> {
  const snap = await getDoc(doc(db, ENROLLMENTS, id));
  if (!snap.exists()) return null;
  return toEnrollment(snap as QueryDocumentSnapshot<DocumentData>);
}

export async function updateEnrollmentStatus(
  id: string,
  status: EnrollmentStatus,
): Promise<void> {
  await updateDoc(doc(db, ENROLLMENTS, id), { status });
}

// ── Stats (dashboard) ────────────────────────────────────────────────────────

export interface DashboardStats {
  total: number;
  today: number;
  thisWeek: number;
  thisMonth: number;
  byProgram: { program: string; label: string; count: number }[];
  overTime: { date: string; count: number }[];
}

async function countWhere(...constraints: QueryConstraint[]): Promise<number> {
  const snap = await getCountFromServer(
    query(collection(db, ENROLLMENTS), ...constraints),
  );
  return snap.data().count;
}

function startOfWeekUTC(d: Date): Date {
  const date = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const day = date.getUTCDay(); // 0 = Sunday
  const diff = (day + 6) % 7; // make Monday the first day
  date.setUTCDate(date.getUTCDate() - diff);
  return date;
}

export async function fetchDashboardStats(): Promise<DashboardStats> {
  const now = new Date();
  const todayStr = utcDateString(now);
  const weekStr = utcDateString(startOfWeekUTC(now));
  const monthStr = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}-01`;

  const [total, today, thisWeek, thisMonth] = await Promise.all([
    countWhere(),
    countWhere(where('createdDate', '==', todayStr)),
    countWhere(where('createdDate', '>=', weekStr)),
    countWhere(where('createdDate', '>=', monthStr)),
  ]);

  // Per-program counts (one aggregation query each — cheap, 6 reads total).
  const byProgram = await Promise.all(
    PROGRAM_OPTIONS.map(async (p) => ({
      program: p.value,
      label: p.label,
      count: await countWhere(where('program', '==', p.value)),
    })),
  );

  // Time series: group the most recent records by day.
  const recent = await getDocs(
    query(collection(db, ENROLLMENTS), orderBy('createdAt', 'desc'), fbLimit(1000)),
  );
  const byDate = new Map<string, number>();
  recent.docs.forEach((d) => {
    const date = d.data().createdDate as string;
    if (date) byDate.set(date, (byDate.get(date) ?? 0) + 1);
  });
  const overTime = Array.from(byDate.entries())
    .map(([date, count]) => ({ date, count }))
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(-30); // last 30 days with activity

  return { total, today, thisWeek, thisMonth, byProgram, overTime };
}

export { PAGE_SIZE };
