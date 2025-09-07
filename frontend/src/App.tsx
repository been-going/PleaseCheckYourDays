import { Routes, Route, Link, Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import { useEffect } from 'react';

// Import Pages
import TodayCombined from './pages/TodayCombined';
import Calendar from './pages/Calendar';
import { FixedCosts } from './pages/FixedCosts';
import LoginPage from './pages/LoginPage';
import SignupPage from './pages/SignupPage';
import GoalsPage from './pages/GoalsPage';
import DashboardPage from './pages/DashboardPage';

// 1. Protected Route Component
// Renders child routes if the user is authenticated or a guest.
// Waits for the initial authentication check to complete.
const ProtectedRoute = () => {
  const { isAuthLoading } = useAuth();

  // While checking auth state, render nothing.
  if (isAuthLoading) {
    return null;
  }

  // After auth check, render the main app content (for both users and guests).
  return <Outlet />;
};

// 2. Main Layout Component
// Contains the navigation bar and dynamic auth buttons.
const AppLayout = () => {
  const { isAuthenticated, logout } = useAuth();
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
        
        <div style={{ marginLeft: 'auto' }}>
          {isAuthenticated ? (
            <button className="btn" onClick={logout}>
              로그아웃
            </button>
          ) : (
            <>
              <Link to="/login" className="btn">로그인</Link>
              <Link to="/signup" className="btn">회원가입</Link>
            </>
          )}
        </div>
      </nav>
      <Outlet /> {/* Child routes will be rendered here */}
    </div>
  );
};

// 3. Main App Component with Routing
export default function App() {
  return (
    <Routes>
      {/* Public routes - login and signup are accessible to everyone */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/signup" element={<SignupPage />} />

      {/* Main application routes are protected */}
      <Route element={<ProtectedRoute />}>
        <Route element={<AppLayout />}>
          <Route path="/" element={<TodayCombined />} />
          <Route path="/calendar" element={<Calendar />} />
          <Route path="/fixed-costs" element={<FixedCosts />} />
          <Route path="/goals" element={<GoalsPage />} />
          <Route path="/dashboard" element={<DashboardPage />} />
        </Route>
      </Route>

      {/* Fallback for any other path */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}