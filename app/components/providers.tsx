'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useState, createContext, useContext, useEffect, useCallback } from 'react'
import { User } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/client'
import type { Profile } from '@/types'

// ============================================
// Auth Context - Centralized auth state
// ============================================
interface AuthContextType {
  user: User | null
  profile: Profile | null
  isLoading: boolean
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | null>(null)

export function useAuthContext() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuthContext must be used within Providers')
  }
  return context
}

// ============================================
// Providers Component
// ============================================
export function Providers({ children }: { children: React.ReactNode }) {
  // React Query client with optimized settings
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            // Cache data for 5 minutes - challenge data doesn't change often
            staleTime: 5 * 60 * 1000,
            // Keep unused data in cache for 30 minutes
            gcTime: 30 * 60 * 1000,
            // Don't refetch on window focus - reduces unnecessary calls
            refetchOnWindowFocus: false,
            // Use cached data when component remounts
            refetchOnMount: false,
            // Fail faster with fewer retries
            retry: 1,
            // Dedupe requests within 2 seconds
            refetchInterval: false,
          },
        },
      })
  )

  // Centralized auth state - single source of truth
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  
  const supabase = createClient()

  // Fetch profile helper
  const fetchProfile = useCallback(async (userId: string) => {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single()
    return data as Profile | null
  }, [supabase])

  // Sign out helper
  const signOut = useCallback(async () => {
    await supabase.auth.signOut()
    setUser(null)
    setProfile(null)
    queryClient.clear() // Clear all cached queries on sign out
  }, [supabase, queryClient])

  // Initialize auth state once on mount
  useEffect(() => {
    let mounted = true

    const initAuth = async () => {
      try {
        const { data: { user: currentUser } } = await supabase.auth.getUser()
        
        if (!mounted) return
        
        setUser(currentUser)
        
        if (currentUser) {
          const userProfile = await fetchProfile(currentUser.id)
          if (mounted) {
            setProfile(userProfile)
          }
        }
      } catch (error) {
        console.error('Auth initialization error:', error)
      } finally {
        if (mounted) {
          setIsLoading(false)
        }
      }
    }

    initAuth()

    // Subscribe to auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!mounted) return
        
        const newUser = session?.user ?? null
        setUser(newUser)
        
        if (newUser) {
          const userProfile = await fetchProfile(newUser.id)
          if (mounted) {
            setProfile(userProfile)
          }
        } else {
          setProfile(null)
        }
      }
    )

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [supabase, fetchProfile])

  const authValue: AuthContextType = {
    user,
    profile,
    isLoading,
    signOut,
  }

  return (
    <AuthContext.Provider value={authValue}>
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    </AuthContext.Provider>
  )
}

