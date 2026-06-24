import type { Timestamp } from 'firebase/firestore';

export type EnrollmentStatus = 'new' | 'verified' | 'rejected';

export interface Address {
  line1?: string;
  city?: string;
  state?: string;
  zip?: string;
}

/** Shape of an enrollment document as stored in Firestore. */
export interface EnrollmentDoc {
  enrollmentId: string;
  fullName: string;
  email: string;
  phone: string;
  dob?: string;
  gender?: string;
  program: string;
  source?: string;
  address?: Address;
  status: EnrollmentStatus;
  createdAt: Timestamp | null;
  createdDate: string; // YYYY-MM-DD for range queries
  emailLower?: string;
  dupKey?: string; // composite duplicate-check key
}

/** Enrollment as used in the UI — includes the Firestore document id. */
export interface Enrollment extends Omit<EnrollmentDoc, 'createdAt'> {
  id: string;
  createdAt: Date | null;
}
