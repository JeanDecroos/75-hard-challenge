import type { Metadata } from 'next'
import { GeistSans } from 'geist/font/sans'
import { GeistMono } from 'geist/font/mono'
import { Toaster } from '@/components/ui/toaster'
import { Providers } from '@/components/providers'
import './globals.css'

export const metadata: Metadata = {
  title: '75 Hard Challenge Tracker',
  description: 'Create and track your customizable 75-Hard style challenge',
  keywords: ['75 hard', 'challenge', 'fitness', 'habit tracking', 'self improvement'],
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="dark">
      <body className={`${GeistSans.variable} ${GeistMono.variable} font-sans antialiased`}>
        <Providers>
          <div className="relative min-h-screen bg-background">
            <div className="fixed inset-0 animated-gradient opacity-30 pointer-events-none" />
            <div className="relative z-10">
              {children}
            </div>
          </div>
          <Toaster />
        </Providers>
      </body>
    </html>
  )
}

