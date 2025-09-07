import { createContext, useState, useContext, useEffect, ReactNode } from 'react';

interface AuthContextType {
  token: string | null;
  isAuthenticated: boolean;
  isGuest: boolean;
  isAuthLoading: boolean; // To track initial auth state check
  login: (token: string) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [token, setToken] = useState<string | null>(null);
  const [isGuest, setIsGuest] = useState<boolean>(false);
  const [isAuthLoading, setIsAuthLoading] = useState<boolean>(true);

  // On initial mount, check for token in localStorage to determine auth state
  useEffect(() => {
    const storedToken = localStorage.getItem('authToken');
    if (storedToken) {
      setToken(storedToken);
      setIsGuest(false);
    } else {
      setIsGuest(true);
    }
    setIsAuthLoading(false);
  }, []);

  // Effect to update localStorage when token changes
  useEffect(() => {
    if (token) {
      localStorage.setItem('authToken', token);
    } else {
      localStorage.removeItem('authToken');
    }
  }, [token]);

  const login = (newToken: string) => {
    setToken(newToken);
    setIsGuest(false);
  };

  const logout = () => {
    setToken(null);
    setIsGuest(true); // Directly transition to guest mode
  };

  // The startGuestSession function is no longer needed as guest status is the default
  
  return (
    <AuthContext.Provider value={{ 
      token, 
      isAuthenticated: !!token, 
      isGuest, 
      isAuthLoading,
      login, 
      logout 
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
