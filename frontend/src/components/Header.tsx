import { useState } from "react";
import { NavLink } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import "./Header.css";

export function Header() {
  const { isAuthenticated, user, logout } = useAuth();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const closeMenu = () => setIsMenuOpen(false);

  return (
    <header className="app-header">
      <div className="header-content">
        <NavLink to="/today" className="logo" onClick={closeMenu}>
          <span
            role="img"
            aria-label="calendar icon"
            style={{ fontSize: "1.5rem" }}
          >
            🗓️
          </span>
          <span>Check Your Days</span>
        </NavLink>

        <div className={`nav-container ${isMenuOpen ? "open" : ""}`}>
          <nav className="main-nav">
            <NavLink to="/today" onClick={closeMenu}>
              체크리스트
            </NavLink>
            <NavLink to="/calendar" onClick={closeMenu}>
              캘린더
            </NavLink>
            <NavLink to="/dashboard" onClick={closeMenu}>
              대시보드
            </NavLink>
            <NavLink to="/fixed-costs" onClick={closeMenu}>
              고정비
            </NavLink>
          </nav>
          <div className="user-actions">
            {isAuthenticated ? (
              <>
                <span className="user-email">{user?.email}</span>
                <button
                  onClick={() => {
                    logout();
                    closeMenu();
                  }}
                  className="btn"
                >
                  로그아웃
                </button>
              </>
            ) : (
              <NavLink to="/login" className="btn primary" onClick={closeMenu}>
                로그인
              </NavLink>
            )}
          </div>
        </div>

        <button
          className="mobile-menu-toggle"
          onClick={() => setIsMenuOpen(!isMenuOpen)}
          aria-label="Toggle menu"
        >
          {isMenuOpen ? "✕" : "☰"}
        </button>
      </div>
    </header>
  );
}
