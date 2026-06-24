/**
 * Firebase initialisation.
 *
 * Reads config from Vite env vars (see .env.example). When
 * VITE_USE_EMULATOR === "true", connects to the local Auth + Firestore
 * emulators so the app can run end-to-end with no real Firebase project.
 */
import { initializeApp, type FirebaseApp } from 'firebase/app';
import {
  getFirestore,
  connectFirestoreEmulator,
  type Firestore,
} from 'firebase/firestore';
import {
  getAuth,
  connectAuthEmulator,
  type Auth,
} from 'firebase/auth';

const useEmulator = import.meta.env.VITE_USE_EMULATOR === 'true';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || 'demo-api-key',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || 'demo.firebaseapp.com',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || 'demo-enrollment',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || 'demo.appspot.com',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '000000000000',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || '1:000000000000:web:demo',
};

export const app: FirebaseApp = initializeApp(firebaseConfig);
export const db: Firestore = getFirestore(app);
export const auth: Auth = getAuth(app);

export const blockDuplicates = import.meta.env.VITE_BLOCK_DUPLICATES !== 'false';

if (useEmulator) {
  const host = import.meta.env.VITE_EMULATOR_HOST || '127.0.0.1';
  const fsPort = Number(import.meta.env.VITE_FIRESTORE_EMULATOR_PORT || 8080);
  const authPort = Number(import.meta.env.VITE_AUTH_EMULATOR_PORT || 9099);

  // Guard against double-connection during Vite HMR.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  if (!(globalThis as any).__EMULATORS_CONNECTED__) {
    connectFirestoreEmulator(db, host, fsPort);
    connectAuthEmulator(auth, `http://${host}:${authPort}`, { disableWarnings: true });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (globalThis as any).__EMULATORS_CONNECTED__ = true;
    // eslint-disable-next-line no-console
    console.info(`[firebase] Connected to local emulators (Auth:${authPort}, Firestore:${fsPort}).`);
  }
}
