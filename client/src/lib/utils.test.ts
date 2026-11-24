import { describe, expect, it } from 'vitest';
import { getApiErrorMessage } from './utils';

describe('getApiErrorMessage', () => {
  it('uses the API message for Axios errors', () => {
    const error = {
      isAxiosError: true,
      response: { data: { success: false, message: 'Too many authentication attempts' } },
    };

    expect(getApiErrorMessage(error, 'Request failed')).toBe('Too many authentication attempts');
  });

  it('uses the fallback for non-error values', () => {
    expect(getApiErrorMessage(null, 'Request failed')).toBe('Request failed');
  });
});
