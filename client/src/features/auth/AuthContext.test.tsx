import { fireEvent, render, screen } from '@testing-library/react';
import { AxiosHeaders, type AxiosResponse } from 'axios';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { authApi } from '../../api/endpoints';
import { getAccessToken, setAccessToken } from '../../api/client';
import type { ApiResponse, AuthResponse, User } from '../../types';
import { AuthProvider, useAuth } from './AuthContext';

vi.mock('../../api/endpoints', () => ({
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

vi.mock('../../api/client', () => ({
  getAccessToken: vi.fn(() => null),
  setAccessToken: vi.fn(),
  clearAccessToken: vi.fn(),
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

function AuthConsumer() {
  const { user: currentUser, login, register } = useAuth();

  return (
    <>
      <p>{currentUser?.name ?? 'Signed out'}</p>
      <button onClick={() => void login({ email: user.email, password: 'password123' })}>
        Log in
      </button>
      <button onClick={() => void register({ name: user.name, email: user.email, password: 'password123' })}>
        Register
      </button>
    </>
  );
}

describe('AuthProvider', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('sets the user and access token from the wrapped login response', async () => {
    vi.mocked(authApi.login).mockResolvedValue(axiosResponse(authResponse));
    render(<AuthProvider><AuthConsumer /></AuthProvider>);

    fireEvent.click(screen.getByRole('button', { name: 'Log in' }));

    expect(await screen.findByText(user.name)).toBeTruthy();
    expect(setAccessToken).toHaveBeenCalledWith('access-token');
  });

  it('sets the user and access token from the wrapped registration response', async () => {
    vi.mocked(authApi.register).mockResolvedValue(axiosResponse(authResponse));
    render(<AuthProvider><AuthConsumer /></AuthProvider>);

    fireEvent.click(screen.getByRole('button', { name: 'Register' }));

    expect(await screen.findByText(user.name)).toBeTruthy();
    expect(setAccessToken).toHaveBeenCalledWith('access-token');
  });

  it('restores the user from the wrapped current-user response', async () => {
    vi.mocked(getAccessToken).mockReturnValue('access-token');
    vi.mocked(authApi.getMe).mockResolvedValue(axiosResponse({ success: true, data: user }));
    render(<AuthProvider><AuthConsumer /></AuthProvider>);

    expect(await screen.findByText(user.name)).toBeTruthy();
  });
});
