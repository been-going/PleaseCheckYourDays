import { Routes, Route, Navigate } from "react-router-dom";
import { Header } from "./components/Header";
import TodayCombined from "./pages/TodayCombined";
import Calendar from "./pages/Calendar";
import { FixedCosts } from "./pages/FixedCosts";
import LoginPage from "./pages/LoginPage";
import SignupPage from "./pages/SignupPage";
import DashboardPage from "./pages/DashboardPage";
import RoutineDetailPage from "./pages/RoutineDetailPage";
import "./App.css";

export default function App() {
  return (
    <>
      <Header />
      <main className="app-main">
        <Routes>
          {/* Public routes */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignupPage />} />

          {/* Main application routes */}
          <Route path="/" element={<Navigate to="/today" replace />} />
          <Route path="/today" element={<TodayCombined />} />
          <Route path="/calendar" element={<Calendar />} />
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/routines/:routineId" element={<RoutineDetailPage />} />
          <Route path="/fixed-costs" element={<FixedCosts />} />

          {/* Fallback for any other path */}
          <Route path="*" element={<Navigate to="/today" replace />} />
        </Routes>
      </main>
    </>
  );
}
