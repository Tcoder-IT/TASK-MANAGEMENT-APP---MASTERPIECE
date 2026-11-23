import { describe, it, expect } from 'vitest';

describe('App', () => {
  it('should have a valid test setup', () => {
    expect(true).toBe(true);
  });

  it('should have vitest configured correctly', () => {
    expect(typeof describe).toBe('function');
    expect(typeof it).toBe('function');
    expect(typeof expect).toBe('function');
  });
});