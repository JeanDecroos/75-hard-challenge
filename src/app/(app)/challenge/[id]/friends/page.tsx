'use client'

import { useState } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Separator } from '@/components/ui/separator'
import { useToast } from '@/components/ui/use-toast'
import { useChallenge, useJoinChallenge } from '@/hooks/use-challenges'
import { useChallengeMembers } from '@/hooks/use-progress'
import { 
  ArrowLeft,
  Copy,
  Users,
  Flame,
  Trophy,
  UserPlus,
  Check,
  Loader2
} from 'lucide-react'

interface PageProps {
  params: {
    id: string
  }
}

export default function FriendsPage({ params }: PageProps) {
  const { toast } = useToast()
  const { data: challenge, isLoading: challengeLoading } = useChallenge(params.id)
  const { data: members, isLoading: membersLoading } = useChallengeMembers(params.id)
  const [copied, setCopied] = useState(false)
  const [inviteCode, setInviteCode] = useState('')
  const joinChallenge = useJoinChallenge()

  const inviteUrl = typeof window !== 'undefined' 
    ? `${window.location.origin}/join/${challenge?.invite_token}` 
    : ''

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(inviteUrl)
      setCopied(true)
      toast({
        title: 'Link copied!',
        description: 'Share it with friends to join your challenge.',
        variant: 'success',
      })
      setTimeout(() => setCopied(false), 2000)
    } catch (error) {
      toast({
        title: 'Failed to copy',
        variant: 'destructive',
      })
    }
  }

  const handleJoinWithCode = async () => {
    if (!inviteCode.trim()) return

    try {
      await joinChallenge.mutateAsync(inviteCode)
      toast({
        title: 'Joined challenge!',
        variant: 'success',
      })
      setInviteCode('')
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to join challenge'
      toast({
        title: 'Failed to join',
        description: message,
        variant: 'destructive',
      })
    }
  }

  if (challengeLoading || membersLoading) {
    return <FriendsSkeleton />
  }

  if (!challenge) {
    return <div>Challenge not found</div>
  }

  // Sort members by completed days
  const sortedMembers = [...(members || [])].sort(
    (a, b) => b.completed_days - a.completed_days
  )

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/dashboard">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="w-5 h-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold">Friends & Leaderboard</h1>
          <p className="text-muted-foreground">{challenge.name}</p>
        </div>
      </div>

      {/* Invite Link */}
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserPlus className="w-5 h-5" />
            Invite Friends
          </CardTitle>
          <CardDescription>
            Share this link with friends to invite them to your challenge
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input
              value={inviteUrl}
              readOnly
              className="font-mono text-sm"
            />
            <Button onClick={handleCopyLink} className="shrink-0 gap-2">
              {copied ? (
                <Check className="w-4 h-4" />
              ) : (
                <Copy className="w-4 h-4" />
              )}
              {copied ? 'Copied!' : 'Copy'}
            </Button>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex-1">
              <Input
                value={challenge.invite_token}
                readOnly
                className="font-mono text-center"
              />
            </div>
            <span className="text-sm text-muted-foreground">Invite Code</span>
          </div>
        </CardContent>
      </Card>

      {/* Join with Code */}
      <Card className="glass-card">
        <CardHeader>
          <CardTitle>Join Another Challenge</CardTitle>
          <CardDescription>
            Enter an invite code to join a friend&apos;s challenge
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <Input
              value={inviteCode}
              onChange={(e) => setInviteCode(e.target.value)}
              placeholder="Enter invite code"
              className="font-mono"
            />
            <Button 
              onClick={handleJoinWithCode} 
              disabled={joinChallenge.isPending || !inviteCode.trim()}
              className="shrink-0"
            >
              {joinChallenge.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                'Join'
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Members Leaderboard */}
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            Challenge Members
          </CardTitle>
          <CardDescription>
            {sortedMembers.length} member{sortedMembers.length !== 1 ? 's' : ''} in this challenge
          </CardDescription>
        </CardHeader>
        <CardContent>
          {sortedMembers.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No one has joined yet.</p>
              <p className="text-sm">Share the invite link to get started!</p>
            </div>
          ) : (
            <div className="space-y-3">
              {sortedMembers.map((member, index) => (
                <motion.div
                  key={member.user_id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <MemberRow member={member} rank={index + 1} />
                </motion.div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function MemberRow({ 
  member, 
  rank 
}: { 
  member: { user_id: string; display_name: string; completed_days: number; current_streak: number }
  rank: number
}) {
  const initials = member.display_name
    ?.split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2) || 'U'

  return (
    <div className="flex items-center gap-4 p-4 rounded-xl bg-secondary/50 border">
      {/* Rank */}
      <div className="w-8 text-center">
        {rank === 1 ? (
          <Trophy className="w-6 h-6 text-yellow-500 mx-auto" />
        ) : rank === 2 ? (
          <Trophy className="w-5 h-5 text-gray-400 mx-auto" />
        ) : rank === 3 ? (
          <Trophy className="w-5 h-5 text-amber-700 mx-auto" />
        ) : (
          <span className="text-lg font-bold text-muted-foreground">#{rank}</span>
        )}
      </div>

      {/* Avatar & Name */}
      <div className="flex items-center gap-3 flex-1">
        <Avatar>
          <AvatarFallback className="bg-primary/20 text-primary">
            {initials}
          </AvatarFallback>
        </Avatar>
        <div>
          <p className="font-medium">{member.display_name}</p>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Flame className="w-3 h-3 text-orange-500" />
            {member.current_streak} day streak
          </div>
        </div>
      </div>

      {/* Progress */}
      <div className="text-right">
        <Badge variant="secondary" className="text-lg">
          {member.completed_days} days
        </Badge>
      </div>
    </div>
  )
}

function FriendsSkeleton() {
  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <div className="flex items-center gap-4">
        <Skeleton className="w-10 h-10" />
        <div className="space-y-2">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-32" />
        </div>
      </div>
      <Card className="glass-card">
        <CardContent className="p-6 space-y-4">
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-10 w-full" />
        </CardContent>
      </Card>
      <Card className="glass-card">
        <CardContent className="p-6 space-y-4">
          <Skeleton className="h-6 w-32" />
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </CardContent>
      </Card>
    </div>
  )
}

