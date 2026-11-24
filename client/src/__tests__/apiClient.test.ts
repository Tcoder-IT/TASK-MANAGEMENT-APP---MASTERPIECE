import axios, {
  AxiosError,
  AxiosHeaders,
  type AxiosAdapter,
  type AxiosResponse,
  type InternalAxiosRequestConfig,
} from 'axios';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { authApi } from '../api/endpoints';
import { api } from '../api/client';

function axiosResponse<T>(data: T, config?: InternalAxiosRequestConfig): AxiosResponse<T> {
  return {
    data,
    status: 200,
    statusText: 'OK',
    headers: new AxiosHeaders(),
    config: config ?? { headers: new AxiosHeaders() },
  };
}

function unauthorizedError(config: InternalAxiosRequestConfig) {
  const response: AxiosResponse = {
    data: { success: false, message: 'Invalid credentials' },
    status: 401,
    statusText: 'Unauthorized',
    headers: new AxiosHeaders(),
    config,
  };
  return new AxiosError('Unauthorized', AxiosError.ERR_BAD_REQUEST, config, undefined, response);
}

describe('API authentication refresh interceptor', () => {
  let originalAdapter: AxiosAdapter | AxiosAdapter[] | string | undefined;

  beforeEach(() => {
    originalAdapter = api.defaults.adapter;
    vi.stubGlobal('localStorage', {
      getItem: () => null,
      setItem: vi.fn(),
      removeItem: vi.fn(),
    });
  });

  afterEach(() => {
    api.defaults.adapter = originalAdapter;
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('does not refresh or reload the page for invalid login credentials', async () => {
    api.defaults.adapter = async (config) => {
      throw unauthorizedError(config);
    };
    const refreshRequest = vi.spyOn(axios, 'post').mockResolvedValue(
      axiosResponse({ data: { accessToken: 'refreshed-token' } })
    );

    await expect(
      authApi.login({ email: 'study@example.com', password: 'wrong-password' })
    ).rejects.toMatchObject({ response: { status: 401 } });

    expect(refreshRequest).not.toHaveBeenCalled();
  });

  it('still refreshes an expired session for protected API requests', async () => {
    let requestCount = 0;
    api.defaults.adapter = async (config) => {
      requestCount += 1;
      if (requestCount === 1) throw unauthorizedError(config);
      return axiosResponse({ success: true }, config);
    };
    const refreshRequest = vi.spyOn(axios, 'post').mockResolvedValue(
      axiosResponse({ data: { accessToken: 'refreshed-token' } })
    );

    const response = await api.get('/protected');

    expect(response.data.success).toBe(true);
    expect(requestCount).toBe(2);
    expect(refreshRequest).toHaveBeenCalledTimes(1);
  });
});
