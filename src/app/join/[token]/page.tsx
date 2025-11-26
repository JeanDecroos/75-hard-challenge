'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useToast } from '@/components/ui/use-toast'
import { useAuth } from '@/hooks/use-auth'
import { useJoinChallenge } from '@/hooks/use-challenges'
import { createClient } from '@/lib/supabase/client'
import { 
  Flame, 
  Loader2, 
  Users,
  ArrowRight,
  LogIn
} from 'lucide-react'

interface PageProps {
  params: {
    token: string
  }
}

export default function JoinChallengePage({ params }: PageProps) {
  const router = useRouter()
  const { toast } = useToast()
  const { user, loading: authLoading } = useAuth()
  const joinChallenge = useJoinChallenge()
  const supabase = createClient()

  const [challenge, setChallenge] = useState<{ id: string; name: string; duration_days: number } | null>(null)
  const [loading, setLoading] = useState(true)
  const [joining, setJoining] = useState(false)

  useEffect(() => {
    const fetchChallenge = async () => {
      const { data, error } = await supabase
        .from('challenges')
        .select('id, name, duration_days')
        .eq('invite_token', params.token)
        .single()

      if (error || !data) {
        setChallenge(null)
      } else {
        setChallenge(data)
      }
      setLoading(false)
    }

    fetchChallenge()
  }, [params.token, supabase])

  const handleJoin = async () => {
    if (!user) {
      // Redirect to auth with return URL
      router.push(`/auth?redirect=/join/${params.token}`)
      return
    }

    setJoining(true)
    try {
      await joinChallenge.mutateAsync(params.token)
      toast({
        title: 'Successfully joined!',
        description: `You're now part of ${challenge?.name}`,
        variant: 'success',
      })
      router.push('/dashboard')
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to join challenge'
      toast({
        title: 'Failed to join',
        description: message,
        variant: 'destructive',
      })
      setJoining(false)
    }
  }

  if (loading || authLoading) {
    return (
      <main className="min-h-screen flex items-center justify-center p-4">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-muted-foreground">Loading challenge...</p>
        </div>
      </main>
    )
  }

  if (!challenge) {
    return (
      <main className="min-h-screen flex items-center justify-center p-4">
        <Card className="glass-card max-w-md w-full">
          <CardContent className="pt-6 text-center">
            <div className="w-16 h-16 rounded-2xl bg-destructive/20 flex items-center justify-center mx-auto mb-4">
              <Flame className="w-8 h-8 text-destructive" />
            </div>
            <h2 className="text-xl font-bold mb-2">Invalid Invite Link</h2>
            <p className="text-muted-foreground mb-6">
              This invite link is invalid or has expired. Please ask the 
              challenge owner for a new link.
            </p>
            <Link href="/">
              <Button>Go Home</Button>
            </Link>
          </CardContent>
        </Card>
      </main>
    )
  }

  return (
    <main className="min-h-screen flex items-center justify-center p-4">
      <Card className="glass-card max-w-md w-full">
        <CardHeader className="text-center">
          <div className="w-16 h-16 rounded-2xl bg-primary/20 flex items-center justify-center mx-auto mb-4">
            <Users className="w-8 h-8 text-primary" />
          </div>
          <CardTitle className="text-2xl">You&apos;re Invited!</CardTitle>
          <CardDescription>
            Join your friends in this challenge
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="p-4 rounded-xl bg-secondary/50 border text-center">
            <h3 className="font-semibold text-lg mb-1">{challenge.name}</h3>
            <p className="text-sm text-muted-foreground">
              {challenge.duration_days} day challenge
            </p>
          </div>

          {user ? (
            <Button
              onClick={handleJoin}
              disabled={joining}
              className="w-full gap-2"
              size="lg"
            >
              {joining ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <ArrowRight className="w-4 h-4" />
              )}
              Join Challenge
            </Button>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-center text-muted-foreground">
                Sign in to join this challenge
              </p>
              <Link href={`/auth?redirect=/join/${params.token}`} className="block">
                <Button className="w-full gap-2" size="lg">
                  <LogIn className="w-4 h-4" />
                  Sign In to Join
                </Button>
              </Link>
              <Link href={`/auth?mode=signup&redirect=/join/${params.token}`} className="block">
                <Button variant="outline" className="w-full" size="lg">
                  Create Account
                </Button>
              </Link>
            </div>
          )}
        </CardContent>
      </Card>
    </main>
  )
}

