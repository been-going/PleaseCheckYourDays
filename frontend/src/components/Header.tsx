import { NavLink } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import "./Header.css";

export function Header() {
  const { isAuthenticated, user, logout } = useAuth();

  return (
    <header className="app-header">
      <div className="header-content">
        <NavLink to="/today" className="logo">
          Check Your Days
        </NavLink>
        <nav className="main-nav">
          <NavLink to="/today">체크리스트</NavLink>
          <NavLink to="/calendar">캘린더</NavLink>
          <NavLink to="/dashboard">대시보드</NavLink>
          <NavLink to="/fixed-costs">고정비</NavLink>
        </nav>
        <div className="user-actions">
          {isAuthenticated ? (
            <>
              <span className="user-email">{user?.email}</span>
              <button onClick={logout} className="btn">
                로그아웃
              </button>
            </>
          ) : (
            <NavLink to="/login" className="btn primary">
              로그인
            </NavLink>
          )}
        </div>
      </div>
    </header>
  );
}
