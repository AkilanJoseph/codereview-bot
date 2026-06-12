import { BrowserRouter, Routes, Route, NavLink } from 'react-router-dom';
import { DashboardPage } from './pages/DashboardPage';
import { ReviewDetailPage } from './pages/ReviewDetailPage';
import { ConfigurationPage } from './pages/ConfigurationPage';
import { TeamManagementPage } from './pages/TeamManagementPage';

function NavItem({ to, label }: { to: string; label: string }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        `px-3 py-2 rounded text-sm font-medium transition-colors ${
          isActive ? 'bg-blue-700 text-white' : 'text-blue-100 hover:bg-blue-800'
        }`
      }
    >
      {label}
    </NavLink>
  );
}

function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-blue-900 shadow">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center gap-6">
          <span className="text-white font-bold text-lg mr-4">CodeReview Bot</span>
          <NavItem to="/" label="Dashboard" />
          <NavItem to="/settings/rules" label="Rules" />
          <NavItem to="/settings/team" label="Team" />
        </div>
      </nav>
      <main>{children}</main>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Layout>
        <Routes>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/reviews/:reviewId" element={<ReviewDetailPage />} />
          <Route path="/settings/rules" element={<ConfigurationPage />} />
          <Route path="/settings/team" element={<TeamManagementPage />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  );
}
