import {
  Routes,
  Route,
  Link,
  Navigate,
  Outlet,
  useLocation,
} from "react-router-dom";
import { useAuth } from "./context/AuthContext";
import "./App.css";

// Import Pages
import TodayCombined from "./pages/TodayCombined";
import Calendar from "./pages/Calendar";
import { FixedCosts } from "./pages/FixedCosts";
import LoginPage from "./pages/LoginPage";
import SignupPage from "./pages/SignupPage";
import DashboardPage from "./pages/DashboardPage";
import RoutineDetailPage from "./pages/RoutineDetailPage";

// 1. Protected Route Component
const ProtectedRoute = () => {
  const { isAuthLoading, isAuthenticated } = useAuth();

  if (isAuthLoading) {
    return null; // Or a loading spinner
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
};

// 2. Main Layout Component
const AppLayout = () => {
  const { isAuthenticated, logout } = useAuth();
  const location = useLocation();

  const getLinkClass = (path: string) => {
    return location.pathname === path ? "btn active" : "btn";
  };

  const linkStyle = {
    fontWeight: "bold" as "bold",
    letterSpacing: "1px",
    textDecoration: "none",
  };

  return (
    <div className="container">
      <nav className="toolbar">
        <Link to="/today" className={getLinkClass("/today")} style={linkStyle}>
          체크리스트
        </Link>
        <Link
          to="/calendar"
          className={getLinkClass("/calendar")}
          style={linkStyle}
        >
          달력
        </Link>
        <Link
          to="/dashboard"
          className={getLinkClass("/dashboard")}
          style={linkStyle}
        >
          대시보드
        </Link>
        <Link
          to="/fixed-costs"
          className={getLinkClass("/fixed-costs")}
          style={linkStyle}
        >
          고정비
        </Link>
        <div className="toolbar-actions">
          {isAuthenticated ? (
            <button className="btn" onClick={logout}>
              로그아웃
            </button>
          ) : (
            <Link to="/login" className="btn">
              로그인
            </Link>
          )}
        </div>
      </nav>
      <main>
        <Outlet /> {/* Child routes will be rendered here */}
      </main>
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

      {/* Main application routes are now public, wrapped in AppLayout */}
      <Route path="/" element={<AppLayout />}>
        <Route index element={<Navigate to="/today" replace />} />
        <Route path="today" element={<TodayCombined />} />
        <Route path="calendar" element={<Calendar />} />
        <Route path="dashboard" element={<DashboardPage />} />
        <Route path="routines/:routineId" element={<RoutineDetailPage />} />
        <Route path="fixed-costs" element={<FixedCosts />} />
        {/* Templates route can be added here if needed in the future */}
        {/* <Route path="templates" element={<Templates />} /> */}
      </Route>

      {/* Fallback for any other path */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
