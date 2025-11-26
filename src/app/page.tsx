import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { 
  Target, 
  CheckCircle2, 
  Users, 
  Calendar, 
  Flame,
  ArrowRight,
  Zap
} from 'lucide-react'

export default function HomePage() {
  return (
    <main className="min-h-screen">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 glass border-b">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center">
              <Flame className="w-6 h-6 text-primary" />
            </div>
            <span className="font-bold text-xl">75 Hard</span>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/auth">
              <Button variant="ghost">Sign In</Button>
            </Link>
            <Link href="/auth?mode=signup">
              <Button>Get Started</Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-4">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center space-y-8">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 text-primary text-sm">
              <Zap className="w-4 h-4" />
              Transform your life in 75 days
            </div>
            
            <h1 className="text-5xl md:text-7xl font-bold tracking-tight">
              Build Unbreakable
              <span className="text-gradient block mt-2">Habits & Discipline</span>
            </h1>
            
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Create your personalized 75-Hard challenge. Track daily progress, 
              join friends, and transform your mindset with our beautiful tracking app.
            </p>
            
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
              <Link href="/auth?mode=signup">
                <Button size="xl" className="gap-2 glow">
                  Start Your Challenge
                  <ArrowRight className="w-5 h-5" />
                </Button>
              </Link>
              <Link href="#features">
                <Button size="xl" variant="outline">
                  Learn More
                </Button>
              </Link>
            </div>
          </div>

          {/* Hero Visual */}
          <div className="mt-20 relative">
            <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent z-10 pointer-events-none" />
            <div className="glass-card p-8 md:p-12">
              <div className="grid grid-cols-7 gap-2 md:gap-4">
                {Array.from({ length: 21 }).map((_, i) => (
                  <div
                    key={i}
                    className={`aspect-square rounded-lg flex items-center justify-center text-sm font-medium transition-all
                      ${i < 14 ? 'bg-primary/20 text-primary border border-primary/30' : 
                        i === 14 ? 'bg-primary text-primary-foreground ring-2 ring-primary ring-offset-2 ring-offset-background' :
                        'bg-muted/50 text-muted-foreground'}`}
                  >
                    {i + 1}
                  </div>
                ))}
              </div>
              <div className="mt-8 flex items-center justify-between text-sm text-muted-foreground">
                <span>Day 15 of 75</span>
                <span className="text-primary font-medium">20% Complete</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 px-4">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-bold mb-4">
              Everything You Need to Succeed
            </h2>
            <p className="text-muted-foreground text-lg">
              Powerful features designed to keep you on track
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            <FeatureCard
              icon={<Target className="w-6 h-6" />}
              title="Customizable Challenges"
              description="Start with our default template or create your own tasks. Adjust duration, labels, and targets to fit your goals."
            />
            <FeatureCard
              icon={<CheckCircle2 className="w-6 h-6" />}
              title="Daily Check-ins"
              description="Track your progress with intuitive checkboxes and numeric inputs. Add notes and photos to document your journey."
            />
            <FeatureCard
              icon={<Calendar className="w-6 h-6" />}
              title="Progress Calendar"
              description="Visualize your consistency with a beautiful calendar view. See completed days, streaks, and missed opportunities."
            />
            <FeatureCard
              icon={<Flame className="w-6 h-6" />}
              title="Streak Tracking"
              description="Stay motivated with current and longest streak counters. Break records and maintain your momentum."
            />
            <FeatureCard
              icon={<Users className="w-6 h-6" />}
              title="Challenge Together"
              description="Invite friends to join your challenge. See each other's progress and stay accountable as a group."
            />
            <FeatureCard
              icon={<Zap className="w-6 h-6" />}
              title="Smart Reminders"
              description="Never miss a day with customizable email reminders. Set your preferred time and timezone."
            />
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4">
        <div className="container mx-auto max-w-4xl">
          <div className="glass-card p-12 text-center">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Ready to Transform Your Life?
            </h2>
            <p className="text-muted-foreground text-lg mb-8 max-w-xl mx-auto">
              Join thousands of others who have completed the 75 Hard challenge 
              and built lasting habits.
            </p>
            <Link href="/auth?mode=signup">
              <Button size="xl" className="gap-2 glow">
                Start Your 75 Day Journey
                <ArrowRight className="w-5 h-5" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-8 px-4">
        <div className="container mx-auto max-w-6xl flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Flame className="w-5 h-5 text-primary" />
            <span className="font-semibold">75 Hard Challenge Tracker</span>
          </div>
          <p className="text-sm text-muted-foreground">
            © {new Date().getFullYear()} All rights reserved.
          </p>
        </div>
      </footer>
    </main>
  )
}

function FeatureCard({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode
  title: string
  description: string
}) {
  return (
    <div className="glass-card p-6 hover:bg-white/10 transition-colors">
      <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary mb-4">
        {icon}
      </div>
      <h3 className="text-lg font-semibold mb-2">{title}</h3>
      <p className="text-muted-foreground">{description}</p>
    </div>
  )
}

