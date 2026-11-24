import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { authApi } from '../../api/endpoints';
import type { User, LoginCredentials, RegisterData, ChangePasswordData, UpdateProfileData } from '../../types';
import { toast } from 'sonner';
import { setAccessToken, clearAccessToken, getAccessToken } from '../../api/client';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (credentials: LoginCredentials) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  logout: () => Promise<void>;
  updateProfile: (data: UpdateProfileData) => Promise<void>;
  changePassword: (data: ChangePasswordData) => Promise<void>;
  deleteAccount: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchUser = useCallback(async () => {
    const token = getAccessToken();
    if (!token) {
      setUser(null);
      setLoading(false);
      return;
    }

    try {
      const response = await authApi.getMe();
      setUser(response.data.data);
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUser();
  }, [fetchUser]);

  const login = async (credentials: LoginCredentials) => {
    const response = await authApi.login(credentials);
    setAccessToken(response.data.data.accessToken);
    setUser(response.data.data.user);
    toast.success('Welcome back!');
  };

  const register = async (data: RegisterData) => {
    const response = await authApi.register(data);
    setAccessToken(response.data.data.accessToken);
    setUser(response.data.data.user);
    toast.success('Account created successfully!');
  };

  const logout = async () => {
    await authApi.logout();
    clearAccessToken();
    setUser(null);
    toast.success('Logged out successfully');
  };

  const updateProfile = async (data: UpdateProfileData) => {
    const response = await authApi.updateProfile(data);
    setUser(response.data.data);
    toast.success('Profile updated');
  };

  const changePassword = async (data: ChangePasswordData) => {
    await authApi.changePassword(data);
    clearAccessToken();
    setUser(null);
    toast.success('Password changed. Please log in again.');
  };

  const deleteAccount = async () => {
    await authApi.deleteAccount();
    clearAccessToken();
    setUser(null);
    toast.success('Account deleted');
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, updateProfile, changePassword, deleteAccount }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}