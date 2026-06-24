import { lazy, Suspense } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider } from '@/context/AuthContext';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { Spinner } from '@/components/Spinner';

import EnrollPage from '@/pages/EnrollPage';
import SuccessPage from '@/pages/SuccessPage';

// Admin bundle (Recharts, SheetJS, etc.) is loaded only when needed.
const LoginPage = lazy(() => import('@/pages/admin/LoginPage'));
const AdminLayout = lazy(() => import('@/pages/admin/AdminLayout'));
const DashboardPage = lazy(() => import('@/pages/admin/DashboardPage'));
const EnrollmentsPage = lazy(() => import('@/pages/admin/EnrollmentsPage'));
const EnrollmentDetail = lazy(() => import('@/pages/admin/EnrollmentDetail'));

function PageFallback() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <Spinner label="Loading…" />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Suspense fallback={<PageFallback />}>
          <Routes>
            {/* Public */}
            <Route path="/" element={<EnrollPage />} />
            <Route path="/success" element={<SuccessPage />} />

            {/* Admin */}
            <Route path="/admin/login" element={<LoginPage />} />
            <Route
              path="/admin"
              element={
                <ProtectedRoute>
                  <AdminLayout />
                </ProtectedRoute>
              }
            >
              <Route index element={<DashboardPage />} />
              <Route path="enrollments" element={<EnrollmentsPage />} />
              <Route path="enrollments/:id" element={<EnrollmentDetail />} />
            </Route>

            {/* Fallback */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </AuthProvider>
  );
}
