import { BrowserRouter, Routes, Route, NavLink, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { DashboardPage } from './pages/DashboardPage';
import { ReviewDetailPage } from './pages/ReviewDetailPage';
import { ConfigurationPage } from './pages/ConfigurationPage';
import { TeamManagementPage } from './pages/TeamManagementPage';
import { LoginPage } from './pages/LoginPage';

function NavItem({ to, label }: { to: string; label: string }) {
  return (
    <NavLink
      to={to}
      end={to === '/'}
      className={({ isActive }) =>
        `px-4 py-2 rounded-lg text-sm font-medium transition-all duration-150 ${
          isActive
            ? 'bg-white/20 text-white shadow-sm'
            : 'text-blue-100 hover:bg-white/10 hover:text-white'
        }`
      }
    >
      {label}
    </NavLink>
  );
}

function UserMenu() {
  const { user, logout } = useAuth();
  if (!user) return null;
  return (
    <div className="ml-auto flex items-center gap-3">
      <div className="flex items-center gap-2">
        <div className="w-7 h-7 rounded-full bg-white/20 flex items-center justify-center text-white text-xs font-bold">
          {(user.email ?? 'U')[0]?.toUpperCase()}
        </div>
        <span className="text-blue-100 text-sm hidden sm:block">{user.email}</span>
      </div>
      <button
        onClick={logout}
        className="text-blue-200 hover:text-white text-xs px-3 py-1.5 rounded-lg hover:bg-white/10 transition-colors"
      >
        Sign out
      </button>
    </div>
  );
}

function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-50">
      <nav className="bg-gradient-to-r from-blue-700 to-indigo-700 shadow-lg">
        <div className="max-w-7xl mx-auto px-6 py-3 flex items-center gap-3">
          <div className="flex items-center gap-2 mr-6">
            <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center shadow-inner">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
            <span className="text-white font-bold text-lg tracking-tight">CodeReview Bot</span>
          </div>
          <NavItem to="/" label="Dashboard" />
          <NavItem to="/settings/rules" label="Rules" />
          <NavItem to="/settings/team" label="Team" />
          <UserMenu />
        </div>
      </nav>
      <main className="max-w-7xl mx-auto px-6 py-8">{children}</main>
    </div>
  );
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route
        path="/*"
        element={
          <ProtectedRoute>
            <Layout>
              <Routes>
                <Route path="/" element={<DashboardPage />} />
                <Route path="/reviews/:reviewId" element={<ReviewDetailPage />} />
                <Route path="/settings/rules" element={<ConfigurationPage />} />
                <Route path="/settings/team" element={<TeamManagementPage />} />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </Layout>
          </ProtectedRoute>
        }
      />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}
