import { BrowserRouter, Routes, Route, Navigate, useParams } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { ProtectedRoute, GuestRoute, AdminProtectedRoute, AdminGuestRoute, AppLayout } from './components/Layout';
import Login        from './pages/Login';
import Register     from './pages/Register';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import AdminLogin from './pages/AdminLogin';
import AdminDashboard from './pages/AdminDashboard';
import ApprovalDashboard from './pages/ApprovalDashboard';
import ApproverPermitDetail from './pages/ApproverPermitDetail';
import Dashboard    from './pages/Dashboard';
import PermitForm   from './pages/PermitForm';
import PermitDetail from './pages/PermitDetail';

function LegacyApprovalDetailRedirect() {
  const { id } = useParams();
  return <Navigate to={`/reviews/${id}`} replace />;
}

export default function App() {
  return (
    <BrowserRouter>
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            fontFamily: 'Inter, system-ui, sans-serif',
            fontSize: '13px',
            fontWeight: '500',
          },
        }}
      />

      <Routes>
        {/* Public routes */}
        <Route element={<GuestRoute />}>
          <Route path="/login"    element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password"  element={<ResetPassword />} />
        </Route>
        <Route element={<AdminGuestRoute />}>
          <Route path="/admin/login" element={<AdminLogin />} />
        </Route>

        {/* Admin routes */}
        <Route element={<AdminProtectedRoute />}>
          <Route path="/admin/dashboard" element={<AdminDashboard />} />
        </Route>

        {/* Protected routes — inside AppLayout shell */}
        <Route element={<ProtectedRoute />}>
          <Route element={<AppLayout />}>
            <Route path="/dashboard"      element={<Dashboard />} />
            <Route path="/permits/new"    element={<PermitForm />} />
            <Route path="/permits/:id"    element={<PermitDetail />} />
            <Route path="/reviews"        element={<ApprovalDashboard />} />
            <Route path="/reviews/:id"    element={<ApproverPermitDetail />} />
            <Route path="/approvals"      element={<Navigate to="/reviews" replace />} />
            <Route path="/approvals/:id"  element={<LegacyApprovalDetailRedirect />} />
          </Route>
        </Route>

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
