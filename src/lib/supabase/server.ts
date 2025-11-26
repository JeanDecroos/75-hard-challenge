import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'
import type { Database } from '@/types/database'

export function createClient() {
  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          try {
            const cookieStore = cookies()
          return cookieStore.get(name)?.value
          } catch {
            return undefined
          }
        },
        set(name: string, value: string, options: CookieOptions) {
          try {
            const cookieStore = cookies()
            cookieStore.set({ name, value, ...options })
          } catch {
            // Handle cookie setting in server components
          }
        },
        remove(name: string, options: CookieOptions) {
          try {
            const cookieStore = cookies()
            cookieStore.set({ name, value: '', ...options })
          } catch {
            // Handle cookie removal in server components
          }
        },
      },
    }
  )
}

