import { jsx as _jsx, Fragment as _Fragment, jsxs as _jsxs } from "react/jsx-runtime";
import { Routes, Route, Link, Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from './context/AuthContext';

// Import Pages
import TodayCombined from './pages/TodayCombined';
import Calendar from './pages/Calendar';
import { FixedCosts } from './pages/FixedCosts';
import LoginPage from './pages/LoginPage';
import SignupPage from './pages/SignupPage';
import DashboardPage from './pages/DashboardPage';

// 1. Protected Route Component
const ProtectedRoute = () => {
    const { isAuthLoading } = useAuth();
    if (isAuthLoading) {
        return null;
    }
    return _jsx(Outlet, {});
};

// 2. Main Layout Component
const AppLayout = () => {
    const { isAuthenticated, logout } = useAuth();
    const location = useLocation();
    return (_jsxs("div", { className: "container", children: [_jsxs("nav", { className: "toolbar", children: [
        _jsx(Link, { to: "/", className: `btn ${location.pathname === '/' ? 'active' : ''}`, children: "오늘" }), 
        _jsx(Link, { to: "/calendar", className: `btn ${location.pathname === '/calendar' ? 'active' : ''}`, children: "달력" }), 
        _jsx(Link, { to: "/fixed-costs", className: `btn ${location.pathname === '/fixed-costs' ? 'active' : ''}`, children: "고정비" }), 
        _jsx(Link, { to: "/dashboard", className: `btn ${location.pathname === '/dashboard' ? 'active' : ''}`, children: "대시보드" }), 
        _jsx("div", { style: { marginLeft: 'auto' }, children: isAuthenticated ? (_jsx("button", { className: "btn", onClick: logout, children: "로그아웃" })) : (_jsxs(_Fragment, { children: [_jsx(Link, { to: "/login", className: "btn", children: "로그인" }), _jsx(Link, { to: "/signup", className: "btn", children: "회원가입" })] })) })
    ] }), _jsx(Outlet, {}), " "] }));
};

// 3. Main App Component with Routing
export default function App() {
    return (_jsxs(Routes, { children: [
        _jsx(Route, { path: "/login", element: _jsx(LoginPage, {}) }), 
        _jsx(Route, { path: "/signup", element: _jsx(SignupPage, {}) }), 
        _jsx(Route, { element: _jsx(ProtectedRoute, {}), children: 
            _jsxs(Route, { element: _jsx(AppLayout, {}), children: [
                _jsx(Route, { path: "/", element: _jsx(TodayCombined, {}) }), 
                _jsx(Route, { path: "/calendar", element: _jsx(Calendar, {}) }), 
                _jsx(Route, { path: "/fixed-costs", element: _jsx(FixedCosts, {}) }), 
                _jsx(Route, { path: "/dashboard", element: _jsx(DashboardPage, {}) })
            ] })
        }), 
        _jsx(Route, { path: "*", element: _jsx(Navigate, { to: "/", replace: true }) })
    ] }));
}
