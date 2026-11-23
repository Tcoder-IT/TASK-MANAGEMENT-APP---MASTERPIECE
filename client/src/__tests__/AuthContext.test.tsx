import { describe, it, expect, beforeEach, afterEach, vi, renderHook } from 'vitest'
import { useAuth } from '@/features/auth/AuthContext'

beforeEach(() => {
  ;(global as any).localStorage = {
    getItem: (key: string) => localStorage.getItem(key),
    setItem: (key: string, value: string) => localStorage.setItem(key, value),
    removeItem: (key: string) => localStorage.removeItem(key),
    clear: () => localStorage.clear(),
  }
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('AuthContext', () => {
  it('should initialize with no user', () => {
    const { result } = renderHook(() => useAuth())
    expect(result.current.user).toBeNull()
  })
})