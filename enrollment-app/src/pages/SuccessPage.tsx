/** Success screen with the enrollment reference number (FR-1.6). */
import { Link, Navigate, useLocation } from 'react-router-dom';

export default function SuccessPage() {
  const location = useLocation();
  const enrollmentId = (location.state as { enrollmentId?: string } | null)?.enrollmentId;

  // Direct navigation without an id → send back to the form.
  if (!enrollmentId) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-brand-50 to-slate-50 px-4">
      <div className="card w-full max-w-md p-8 text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
          <svg className="h-8 w-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h1 className="text-2xl font-bold text-slate-900">Enrollment Submitted!</h1>
        <p className="mt-2 text-sm text-slate-500">
          Thank you for enrolling. Please keep your reference number for your records.
        </p>

        <div className="mt-6 rounded-lg border border-dashed border-brand-300 bg-brand-50 px-4 py-4">
          <p className="text-xs font-medium uppercase tracking-wide text-brand-700">
            Your reference number
          </p>
          <p className="mt-1 font-mono text-xl font-bold text-brand-800">{enrollmentId}</p>
        </div>

        <Link to="/" className="btn-secondary mt-6 w-full">
          Submit another enrollment
        </Link>
      </div>
    </div>
  );
}
