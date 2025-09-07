import { jsx as _jsx } from "react/jsx-runtime";
import { createContext, useState, useContext, useEffect } from 'react';
const AuthContext = createContext(undefined);
export const AuthProvider = ({ children }) => {
    const [token, setToken] = useState(localStorage.getItem('authToken'));
    const [isGuest, setIsGuest] = useState(false);
    console.log('AuthContext: Render - token:', token, 'isGuest:', isGuest, 'isAuthenticated:', !!token);
    useEffect(() => {
        console.log('AuthContext: useEffect - token changed to:', token);
        if (token) {
            localStorage.setItem('authToken', token);
            setIsGuest(false); // If there's a token, user is not a guest
        }
        else {
            localStorage.removeItem('authToken');
        }
    }, [token]);
    const login = (newToken) => {
        console.log('AuthContext: login called with token:', newToken);
        setToken(newToken);
        setIsGuest(false);
    };
    const logout = () => {
        console.log('AuthContext: logout called');
        setToken(null);
        setIsGuest(false);
    };
    const startGuestSession = () => {
        console.log('AuthContext: startGuestSession called');
        setToken(null); // Ensure no token
        setIsGuest(true); // Set guest to true
    };
    return (_jsx(AuthContext.Provider, { value: { token, isAuthenticated: !!token, isGuest, login, logout, startGuestSession }, children: children }));
};
export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};