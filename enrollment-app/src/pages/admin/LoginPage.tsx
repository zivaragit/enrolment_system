/** Admin login (FR-2.1) via Firebase Auth email/password. */
import { useState, type FormEvent } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { FirebaseError } from 'firebase/app';
import { useAuth } from '@/context/AuthContext';

export default function LoginPage() {
  const { login, user, isAdmin } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: { pathname: string } } | null)?.from?.pathname
    ?? '/admin';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // Already authenticated → skip the form.
  if (user && isAdmin) {
    navigate(from, { replace: true });
  }

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await login(email.trim(), password);
      navigate(from, { replace: true });
    } catch (err) {
      if (err instanceof FirebaseError) {
        setError(
          err.code === 'auth/invalid-credential' ||
            err.code === 'auth/wrong-password' ||
            err.code === 'auth/user-not-found'
            ? 'Incorrect email or password.'
            : err.code === 'auth/too-many-requests'
              ? 'Too many attempts. Please try again later.'
              : 'Unable to sign in. Please try again.',
        );
      } else {
        setError('Unable to sign in. Please try again.');
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100 px-4">
      <div className="card w-full max-w-sm p-8">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-brand-600 text-lg font-bold text-white">
            E
          </div>
          <h1 className="text-xl font-bold text-slate-900">Admin Sign In</h1>
          <p className="mt-1 text-sm text-slate-500">Enrollment System dashboard</p>
        </div>

        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label htmlFor="email" className="label">Email</label>
            <input
              id="email"
              type="email"
              autoComplete="username"
              className="input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div>
            <label htmlFor="password" className="label">Password</label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              className="input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </div>
          )}

          <button type="submit" className="btn-primary w-full" disabled={busy}>
            {busy ? 'Signing in…' : 'Sign In'}
          </button>
        </form>

        <Link to="/" className="mt-4 block text-center text-xs text-slate-400 hover:text-slate-600">
          ← Back to enrollment form
        </Link>
      </div>
    </div>
  );
}
