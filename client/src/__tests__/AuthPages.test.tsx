import { fireEvent, render, screen } from '@testing-library/react';
import { AxiosHeaders, type AxiosResponse } from 'axios';
import { MemoryRouter, Navigate, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { authApi } from '../api/endpoints';
import { AuthProvider, useAuth } from '../features/auth/AuthContext';
import Login from '../pages/Login';
import Register from '../pages/Register';
import type { ApiResponse, AuthResponse, User } from '../types';

vi.mock('../api/endpoints', () => ({
  authApi: {
    getMe: vi.fn(),
    login: vi.fn(),
    register: vi.fn(),
    logout: vi.fn(),
    updateProfile: vi.fn(),
    changePassword: vi.fn(),
    deleteAccount: vi.fn(),
  },
}));

vi.mock('../api/client', () => ({
  getAccessToken: vi.fn(() => null),
  setAccessToken: vi.fn(),
  clearAccessToken: vi.fn(),
}));

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

const user: User = {
  id: 'user-1',
  name: 'Study User',
  email: 'study@example.com',
  role: 'user',
  settings: {
    theme: 'light',
    defaultView: 'list',
    remindersEnabled: true,
    reminderOffsets: [],
  },
  pushSubscriptions: [],
};

const authResponse: ApiResponse<AuthResponse> = {
  success: true,
  data: { accessToken: 'access-token', user },
};

function axiosResponse<T>(data: T): AxiosResponse<T> {
  return {
    data,
    status: 200,
    statusText: 'OK',
    headers: new AxiosHeaders(),
    config: { headers: new AxiosHeaders() },
  };
}

function DashboardRoute() {
  const { user: currentUser, loading } = useAuth();

  if (loading) return <p>Loading account</p>;
  return currentUser ? <h1>Dashboard</h1> : <Navigate to="/login" replace />;
}

function renderAuthRoute(path: '/login' | '/register') {
  return render(
    <MemoryRouter
      initialEntries={[path]}
      future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
    >
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/dashboard" element={<DashboardRoute />} />
        </Routes>
      </AuthProvider>
    </MemoryRouter>
  );
}

describe('Login and registration pages', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('signs in and reaches the protected dashboard', async () => {
    vi.mocked(authApi.login).mockResolvedValue(axiosResponse(authResponse));
    renderAuthRoute('/login');

    fireEvent.change(screen.getByLabelText('Email'), {
      target: { value: 'STUDY@example.com' },
    });
    fireEvent.change(screen.getByLabelText('Password'), {
      target: { value: 'password123' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Sign in' }));

    expect(await screen.findByRole('heading', { name: 'Dashboard' })).toBeTruthy();
    expect(authApi.login).toHaveBeenCalledWith({
      email: 'study@example.com',
      password: 'password123',
    });
  });

  it('registers a normalized account and reaches the protected dashboard', async () => {
    vi.mocked(authApi.register).mockResolvedValue(axiosResponse(authResponse));
    renderAuthRoute('/register');

    fireEvent.change(screen.getByLabelText('Full Name'), {
      target: { value: '  Study User  ' },
    });
    fireEvent.change(screen.getByLabelText('Email'), {
      target: { value: 'STUDY@example.com' },
    });
    fireEvent.change(screen.getByLabelText('Password'), {
      target: { value: 'password123' },
    });
    fireEvent.change(screen.getByLabelText('Confirm Password'), {
      target: { value: 'password123' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Create Account' }));

    expect(await screen.findByRole('heading', { name: 'Dashboard' })).toBeTruthy();
    expect(authApi.register).toHaveBeenCalledWith({
      name: 'Study User',
      email: 'study@example.com',
      password: 'password123',
    });
  });
});
