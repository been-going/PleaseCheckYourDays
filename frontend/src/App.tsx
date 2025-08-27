import { Routes, Route, Link, Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from './context/AuthContext';

// Import Pages
import TodayCombined from './pages/TodayCombined';
import Calendar from './pages/Calendar';
import { FixedCosts } from './pages/FixedCosts';
import LoginPage from './pages/LoginPage';
import SignupPage from './pages/SignupPage';
import GoalsPage from './pages/GoalsPage';
import DashboardPage from './pages/DashboardPage';

// 1. Protected Route Component
// If not authenticated, redirects to the login page.
const ProtectedRoute = () => {
  const { isAuthenticated } = useAuth();
  return isAuthenticated ? <Outlet /> : <Navigate to="/login" replace />;
};

// 2. Main Layout Component
// Contains the navigation bar and logout button.
const AppLayout = () => {
  const { logout } = useAuth();
  const location = useLocation();

  return (
    <div className="container">
      <nav className="toolbar">
        <Link to="/" className={`btn ${location.pathname === '/' ? 'active' : ''}`}>
          오늘
        </Link>
        <Link to="/calendar" className={`btn ${location.pathname === '/calendar' ? 'active' : ''}`}>
          달력
        </Link>
        <Link to="/fixed-costs" className={`btn ${location.pathname === '/fixed-costs' ? 'active' : ''}`}>
          고정비
        </Link>
        <Link to="/goals" className={`btn ${location.pathname === '/goals' ? 'active' : ''}`}>
          목표
        </Link>
        <Link to="/dashboard" className={`btn ${location.pathname === '/dashboard' ? 'active' : ''}`}>
          대시보드
        </Link>
        <button className="btn" onClick={logout} style={{ marginLeft: 'auto' }}>
          로그아웃
        </button>
      </nav>
      <Outlet /> {/* Child routes will be rendered here */}
    </div>
  );
};

// 3. Main App Component with Routing
export default function App() {
  return (
    <Routes>
      {/* Public Routes */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/signup" element={<SignupPage />} />

      {/* Protected Routes */}
      <Route element={<ProtectedRoute />}>
        <Route element={<AppLayout />}>
          <Route path="/" element={<TodayCombined />} />
          <Route path="/calendar" element={<Calendar />} />
          <Route path="/fixed-costs" element={<FixedCosts />} />
          <Route path="/goals" element={<GoalsPage />} />
          <Route path="/dashboard" element={<DashboardPage />} />
        </Route>
      </Route>

      {/* Fallback for any other path - might be useful to redirect to main page */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
