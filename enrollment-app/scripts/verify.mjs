/**
 * End-to-end verification of the data layer + security rules against the
 * emulator, using the SAME Firebase client SDK paths the app uses.
 *
 * Usage (emulator must be running):
 *   FIRESTORE_PORT=8088 AUTH_PORT=9098 node scripts/verify.mjs
 */
import { initializeApp } from 'firebase/app';
import {
  getFirestore, connectFirestoreEmulator, collection, addDoc, getDocs,
  serverTimestamp, runTransaction, doc, query, limit,
} from 'firebase/firestore';
import {
  getAuth, connectAuthEmulator, signInWithEmailAndPassword,
} from 'firebase/auth';

const FS_PORT = Number(process.env.FIRESTORE_PORT || 8088);
const AUTH_PORT = Number(process.env.AUTH_PORT || 9098);
const PROJECT = 'demo-enrollment';

const app = initializeApp({ apiKey: 'demo', projectId: PROJECT });
const db = getFirestore(app);
const auth = getAuth(app);
connectFirestoreEmulator(db, '127.0.0.1', FS_PORT);
connectAuthEmulator(auth, `http://127.0.0.1:${AUTH_PORT}`, { disableWarnings: true });

let pass = 0, fail = 0;
const ok = (name) => { console.log(`  ✓ ${name}`); pass++; };
const bad = (name, detail) => { console.log(`  ✗ ${name} — ${detail}`); fail++; };

async function expectDenied(name, fn) {
  try { await fn(); bad(name, 'expected permission denied but it succeeded'); }
  catch (e) {
    if (String(e).includes('permission-denied') || String(e).includes('PERMISSION_DENIED'))
      ok(name);
    else bad(name, `wrong error: ${e.message ?? e}`);
  }
}
async function expectAllowed(name, fn) {
  try { await fn(); ok(name); }
  catch (e) { bad(name, e.message ?? String(e)); }
}

async function main() {
  console.log('NFR-3 / security-rule tests (anonymous):');

  await expectDenied('anonymous CANNOT read enrollments', async () => {
    await getDocs(query(collection(db, 'enrollments'), limit(1)));
  });

  await expectAllowed('anonymous CAN create a valid enrollment', async () => {
    await addDoc(collection(db, 'enrollments'), {
      enrollmentId: 'ENR-2026-09999',
      fullName: 'Test Person',
      email: 'test.person@example.com',
      phone: '+15550000000',
      program: 'web-development',
      status: 'new',
      createdAt: serverTimestamp(),
      createdDate: '2026-06-11',
    });
  });

  await expectDenied('create with missing fullName is rejected', async () => {
    await addDoc(collection(db, 'enrollments'), {
      enrollmentId: 'ENR-2026-09998',
      email: 'bad@example.com',
      phone: '+15550000001',
      program: 'web-development',
      status: 'new',
      createdAt: serverTimestamp(),
    });
  });

  await expectDenied('create with status != "new" is rejected', async () => {
    await addDoc(collection(db, 'enrollments'), {
      enrollmentId: 'ENR-2026-09997',
      fullName: 'Sneaky',
      email: 'sneaky@example.com',
      phone: '+15550000002',
      program: 'web-development',
      status: 'verified',
      createdAt: serverTimestamp(),
    });
  });

  await expectDenied('anonymous CANNOT write to admins', async () => {
    await runTransaction(db, async (tx) => {
      tx.set(doc(db, 'admins', 'hacker'), { role: 'admin' });
    });
  });

  await expectDenied('counter cannot jump by +2', async () => {
    await runTransaction(db, async (tx) => {
      const snap = await tx.get(doc(db, 'meta', 'counters'));
      const seq = snap.exists() ? snap.data().enrollmentSeq : 0;
      tx.set(doc(db, 'meta', 'counters'), { enrollmentSeq: seq + 2 }, { merge: true });
    });
  });

  await expectAllowed('counter +1 increment is allowed', async () => {
    await runTransaction(db, async (tx) => {
      const snap = await tx.get(doc(db, 'meta', 'counters'));
      const seq = snap.exists() ? snap.data().enrollmentSeq : 0;
      tx.set(doc(db, 'meta', 'counters'), { enrollmentSeq: seq + 1 }, { merge: true });
    });
  });

  console.log('\nAdmin-authenticated tests:');
  await signInWithEmailAndPassword(auth, 'admin@enroll.test', 'admin123');

  await expectAllowed('admin CAN read enrollments', async () => {
    const snap = await getDocs(query(collection(db, 'enrollments'), limit(5)));
    if (snap.empty) throw new Error('no docs returned');
  });

  console.log(`\nResult: ${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
}

main().catch((e) => { console.error('verify crashed:', e); process.exit(1); });
