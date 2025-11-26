import { type NextRequest, NextResponse } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'

export async function middleware(request: NextRequest) {
  try {
    return await updateSession(request)
  } catch (error) {
    // If middleware fails, just continue
    return NextResponse.next()
  }
}

export const config = {
  matcher: [
    // Only run middleware on protected routes
    '/dashboard/:path*',
    '/challenge/:path*',
    '/onboarding/:path*',
    '/settings/:path*',
    '/auth/:path*',
  ],
}

