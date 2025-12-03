'use client'

import { useAuthContext } from '@/components/providers'

/**
 * @deprecated Use useAuthContext from '@/components/providers' directly
 * This hook is kept for backwards compatibility
 */
export function useAuth() {
  const { user, profile, isLoading, signOut } = useAuthContext()
  
  return { 
    user, 
    profile, 
    loading: isLoading, // Keep old property name for compatibility
    signOut 
  }
}

