import { Navigate, Outlet } from 'react-router-dom';
import { useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, LogOut, Plus, ClipboardCheck, ChevronRight,
} from 'lucide-react';
import useAuthStore from '../store/authStore';

// ── Route guard ───────────────────────────────────────────────────────────
export function ProtectedRoute() {
  const user = useAuthStore((s) => s.user);
  return user ? <Outlet /> : <Navigate to="/login" replace />;
}

export function GuestRoute() {
  const user = useAuthStore((s) => s.user);
  return user ? <Navigate to="/dashboard" replace /> : <Outlet />;
}

export function AdminProtectedRoute() {
  const user = useAuthStore((s) => s.user);
  const hasAdminSession = typeof window !== 'undefined' && !!localStorage.getItem('admin_id');
  return user && hasAdminSession ? <Outlet /> : <Navigate to="/admin/login" replace />;
}

export function AdminGuestRoute() {
  const hasAdminSession = typeof window !== 'undefined' && !!localStorage.getItem('admin_id');
  return hasAdminSession ? <Navigate to="/admin/dashboard" replace /> : <Outlet />;
}

// ── App shell layout ──────────────────────────────────────────────────────
export function AppLayout() {
  const { user, logout, refreshProfile } = useAuthStore();
  const navigate  = useNavigate();
  const { pathname } = useLocation();

  useEffect(() => {
    refreshProfile();
  }, [refreshProfile]);

  const handleLogout = async () => {
    if (!window.confirm('Log out of your account?')) return;
    await logout();
    navigate('/login');
  };

  const navItems = [
    { to: '/dashboard',   icon: LayoutDashboard, label: 'Dashboard'  },

    // { to: '/permits/new', icon: Plus,            label: 'New Permit' },
    ...(user?.approver_stages?.length ? [{ to: '/reviews', icon: ClipboardCheck, label: 'Review Queue' }] : []),
  ];

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      {/* ── Top nav ─────────────────────────────────────────── */}
      <header className="bg-navy-700 text-white shadow-lg sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex items-center h-14 gap-6">
          {/* Brand */}
          <Link to="/dashboard" className="flex items-center gap-2.5 flex-shrink-0">
            {/* <span className="w-8 h-8 bg-red-700 rounded flex items-center justify-center
                             font-bold text-xs tracking-tight">DS</span> */}
            <span className="font-semibold text-sm hidden sm:block">Work Permit System</span>
          </Link>

          {/* Nav links */}
          <nav className="flex items-center gap-1 flex-1">
            {navItems.map(({ to, icon: Icon, label }) => (
              <Link
                key={to}
                to={to}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs
                            font-semibold transition-colors ${
                  pathname === to
                    ? 'bg-white/15 text-white'
                    : 'text-white/70 hover:bg-white/10 hover:text-white'
                }`}
              >
                <Icon size={14} />
                {label}
              </Link>
            ))}
          </nav>

          {/* User menu */}
          <div className="flex items-center gap-3 flex-shrink-0">
            <div className="hidden sm:flex items-center gap-2 text-xs text-white/70">
              {/* <div className="w-7 h-7 bg-white/20 rounded-full flex items-center
                              justify-content center font-semibold text-white text-[10px]">
                {user?.first_name?.[0]}{user?.last_name?.[0]}
              </div> */}
              <span className="font-medium text-white">{user?.full_name || user?.email}</span>
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center gap-1 text-white/70 hover:text-white
                         text-xs font-semibold transition-colors px-2 py-1.5
                         rounded-lg hover:bg-white/10"
            >
              <LogOut size={13} />
              <span className="hidden sm:block">Logout</span>
            </button>
          </div>
        </div>
      </header>

      {/* ── Page content ────────────────────────────────────── */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-8">
        <Outlet />
      </main>

      {/* ── Footer ──────────────────────────────────────────── */}
      <footer className="border-t border-slate-200 bg-white py-3 text-center
                         text-[10px] text-slate-400">
        DS Group · DS(FDS)/ADM/FM/14 · Version 6.00 · Effective 15 June 2024
      </footer>
    </div>
  );
}

// ── Breadcrumb ────────────────────────────────────────────────────────────
export function Breadcrumb({ items }) {
  return (
    <nav className="flex items-center gap-1 text-xs text-slate-400 mb-6">
      {items.map((item, i) => (
        <span key={i} className="flex items-center gap-1">
          {i > 0 && <ChevronRight size={12} />}
          {item.to
            ? <Link to={item.to} className="hover:text-navy-700 transition-colors">{item.label}</Link>
            : <span className="text-slate-700 font-medium">{item.label}</span>
          }
        </span>
      ))}
    </nav>
  );
}
