import React, { createContext, useContext, useState } from 'react';
import { UserProfile, UserRole } from '../types';
import { api } from '../services/api';

interface AuthContextType {
  user: UserProfile | null;
  role: UserRole;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (usernameOrRoll: string, pass: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  updateProfile: (updated: Partial<UserProfile>) => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  role: 'student',
  isAuthenticated: false,
  isLoading: false,
  login: async () => ({ success: false }),
  logout: () => {},
  updateProfile: () => {},
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Start with no logged-in user (requires authentication on login screen)
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const login = async (usernameOrRoll: string, pass: string) => {
    setIsLoading(true);
    try {
      const res = await api.login(usernameOrRoll, pass);
      if (res.success && res.user) {
        setUser(res.user);
        return { success: true };
      }
      return { success: false, error: res.error || 'Invalid credentials' };
    } catch (e: any) {
      return { success: false, error: e.message || 'Login failed' };
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    setUser(null);
  };

  const updateProfile = (updated: Partial<UserProfile>) => {
    if (user) {
      setUser({ ...user, ...updated });
    }
  };

  const role: UserRole = user?.role || 'student';
  const isAuthenticated = Boolean(user);

  return (
    <AuthContext.Provider
      value={{
        user,
        role,
        isAuthenticated,
        isLoading,
        login,
        logout,
        updateProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
