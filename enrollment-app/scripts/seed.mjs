/**
 * Seed script for the Firebase Emulator Suite.
 *
 * Talks to the local Auth + Firestore emulators over their REST APIs using the
 * emulator's `Bearer owner` token, which bypasses security rules — exactly what
 * you want for seeding. Run the emulators first (npm run emulators), then:
 *
 *   npm run seed
 *
 * Creates:
 *   • an admin auth user  ->  admin@enroll.test / admin123
 *   • admins/{uid} doc
 *   • meta/counters
 *   • ~40 sample enrollments spread across the last 30 days
 */

const PROJECT_ID = process.env.VITE_FIREBASE_PROJECT_ID || 'demo-enrollment';
const FIRESTORE_HOST = process.env.FIRESTORE_EMULATOR_HOST || '127.0.0.1:8080';
const AUTH_HOST = process.env.FIREBASE_AUTH_EMULATOR_HOST || '127.0.0.1:9099';
const FS_BASE = `http://${FIRESTORE_HOST}/v1/projects/${PROJECT_ID}/databases/(default)/documents`;

const ADMIN_EMAIL = 'admin@enroll.test';
const ADMIN_PASSWORD = 'admin123';

const PROGRAMS = [
  'web-development', 'data-science', 'ui-ux-design',
  'digital-marketing', 'cloud-computing', 'cyber-security',
];
const GENDERS = ['male', 'female', 'other', 'prefer-not-to-say'];
const SOURCES = ['search-engine', 'social-media', 'friend-referral', 'advertisement', 'event', 'other'];
const STATUSES = ['new', 'new', 'new', 'verified', 'rejected']; // weighted toward "new"
const FIRST = ['Aarav', 'Diya', 'Vivaan', 'Ananya', 'Aditya', 'Isha', 'Rohan', 'Meera', 'Karan', 'Priya', 'Liam', 'Olivia', 'Noah', 'Emma', 'James', 'Sophia'];
const LAST = ['Sharma', 'Patel', 'Reddy', 'Iyer', 'Khan', 'Nair', 'Gupta', 'Mehta', 'Smith', 'Johnson', 'Williams', 'Brown'];
const CITIES = ['Mumbai', 'Bengaluru', 'Chennai', 'Delhi', 'Pune', 'Hyderabad', 'London', 'Austin'];
const STATES = ['MH', 'KA', 'TN', 'DL', 'MH', 'TS', 'ENG', 'TX'];

// Deterministic PRNG so reseeding is reproducible.
let seed = 12345;
const rand = () => {
  seed = (seed * 1103515245 + 12345) & 0x7fffffff;
  return seed / 0x7fffffff;
};
const pick = (arr) => arr[Math.floor(rand() * arr.length)];
const padId = (n) => String(n).padStart(5, '0');

// ── Firestore REST value encoders ───────────────────────────────────────────
const sv = (v) => ({ stringValue: v });
const iv = (v) => ({ integerValue: String(v) });
const tv = (iso) => ({ timestampValue: iso });
const mapv = (obj) => ({
  mapValue: { fields: Object.fromEntries(Object.entries(obj).map(([k, val]) => [k, sv(val)])) },
});

async function owner(method, path, fields) {
  const res = await fetch(`${FS_BASE}/${path}`, {
    method,
    headers: { Authorization: 'Bearer owner', 'Content-Type': 'application/json' },
    body: fields ? JSON.stringify({ fields }) : undefined,
  });
  if (!res.ok) {
    throw new Error(`${method} ${path} -> ${res.status} ${await res.text()}`);
  }
  return res.json();
}

async function createAdminUser() {
  const res = await fetch(
    `http://${AUTH_HOST}/identitytoolkit.googleapis.com/v1/accounts:signUp?key=fake-api-key`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD, returnSecureToken: true }),
    },
  );
  const body = await res.json();
  if (!res.ok) {
    if (body?.error?.message === 'EMAIL_EXISTS') {
      console.log('  admin user already exists — looking up uid…');
      return lookupUid();
    }
    throw new Error(`auth signUp failed: ${JSON.stringify(body)}`);
  }
  return body.localId;
}

async function lookupUid() {
  // Sign in to retrieve the existing uid.
  const res = await fetch(
    `http://${AUTH_HOST}/identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=fake-api-key`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD, returnSecureToken: true }),
    },
  );
  const body = await res.json();
  if (!res.ok) throw new Error(`auth signIn failed: ${JSON.stringify(body)}`);
  return body.localId;
}

async function main() {
  console.log(`Seeding project "${PROJECT_ID}" via emulators (FS ${FIRESTORE_HOST}, Auth ${AUTH_HOST})…`);

  // 1. Admin user + admins doc
  const uid = await createAdminUser();
  await owner('PATCH', `admins/${uid}`, {
    email: sv(ADMIN_EMAIL),
    role: sv('admin'),
    active: { booleanValue: true },
  });
  console.log(`  ✓ admin user ready (${ADMIN_EMAIL} / ${ADMIN_PASSWORD})`);

  // 2. Enrollments
  const COUNT = 40;
  const now = Date.now();
  const dayMs = 24 * 60 * 60 * 1000;

  for (let i = 1; i <= COUNT; i++) {
    const first = pick(FIRST);
    const last = pick(LAST);
    const program = pick(PROGRAMS);
    const status = pick(STATUSES);
    const daysAgo = Math.floor(rand() * 30);
    const created = new Date(now - daysAgo * dayMs - Math.floor(rand() * dayMs));
    const iso = created.toISOString();
    const createdDate = iso.slice(0, 10);
    const email = `${first}.${last}.${i}`.toLowerCase() + '@example.com';
    const phone = '+1555' + String(1000000 + Math.floor(rand() * 8999999));
    const cityIdx = Math.floor(rand() * CITIES.length);
    const enrollmentId = `ENR-${created.getUTCFullYear()}-${padId(i)}`;

    await owner('POST', `enrollments?documentId=seed-${padId(i)}`, {
      enrollmentId: sv(enrollmentId),
      fullName: sv(`${first} ${last}`),
      email: sv(email),
      emailLower: sv(email),
      phone: sv(phone),
      dob: sv(`19${80 + (i % 20)}-0${1 + (i % 9)}-1${i % 9}`),
      gender: sv(pick(GENDERS)),
      program: sv(program),
      source: sv(pick(SOURCES)),
      address: mapv({
        line1: `${100 + i} Main St`,
        city: CITIES[cityIdx],
        state: STATES[cityIdx],
        zip: String(560000 + i),
      }),
      status: sv(status),
      createdAt: tv(iso),
      createdDate: sv(createdDate),
    });
  }
  console.log(`  ✓ ${COUNT} enrollments seeded`);

  // 3. Counter
  await owner('PATCH', 'meta/counters', { enrollmentSeq: iv(COUNT), year: iv(new Date().getUTCFullYear()) });
  console.log('  ✓ meta/counters set');

  console.log('\nDone. Sign in at /admin/login with:');
  console.log(`  ${ADMIN_EMAIL} / ${ADMIN_PASSWORD}`);
}

main().catch((err) => {
  console.error('\nSeed failed:', err.message);
  console.error('Is the emulator running?  ->  npm run emulators');
  process.exit(1);
});
