# Architecture Documentation

This document describes the technical architecture and key decisions made in the 75 Hard Challenge Tracker project.

## Tech Stack

### Frontend
- **Next.js 14** - React framework with App Router
- **TypeScript** - Type safety
- **Tailwind CSS** - Utility-first styling
- **shadcn/ui** - Pre-built accessible components
- **React Query (TanStack Query)** - Server state management
- **Framer Motion** - Animations

### Backend
- **Supabase** - Backend as a Service
  - PostgreSQL database
  - Row Level Security (RLS)
  - Authentication (email/password + magic link)
  - Storage (progress photos)
  - Edge Functions (reminders)

### Email
- **Resend** - Transactional email service

---

## Project Structure

```
75HardChallenge/
├── src/
│   ├── app/                      # Next.js App Router
│   │   ├── (app)/               # Protected routes (with AppHeader)
│   │   │   ├── dashboard/       # Main dashboard
│   │   │   ├── challenge/[id]/  # Challenge-specific pages
│   │   │   │   ├── check-in/[date]/
│   │   │   │   ├── progress/
│   │   │   │   ├── friends/
│   │   │   │   └── settings/
│   │   │   └── settings/        # User settings
│   │   ├── auth/                # Authentication pages
│   │   ├── join/[token]/        # Invite link handling
│   │   ├── onboarding/          # Challenge creation
│   │   ├── api/                 # API routes
│   │   ├── layout.tsx           # Root layout
│   │   ├── page.tsx             # Landing page
│   │   ├── loading.tsx          # Global loading state
│   │   ├── error.tsx            # Error boundary
│   │   └── not-found.tsx        # 404 page
│   ├── components/
│   │   ├── ui/                  # shadcn/ui components
│   │   ├── app-header.tsx       # Main navigation
│   │   └── providers.tsx        # React Query provider
│   ├── hooks/                   # Custom React hooks
│   │   ├── use-auth.ts          # Auth state management
│   │   ├── use-challenges.ts    # Challenge CRUD operations
│   │   ├── use-tasks.ts         # Task management
│   │   └── use-progress.ts      # Stats and calendar data
│   ├── lib/
│   │   ├── supabase/            # Supabase client config
│   │   │   ├── client.ts        # Browser client
│   │   │   ├── server.ts        # Server client
│   │   │   └── middleware.ts    # Auth middleware
│   │   └── utils.ts             # Utility functions
│   ├── types/                   # TypeScript types
│   │   ├── database.ts          # Supabase generated types
│   │   └── index.ts             # App-specific types
│   └── middleware.ts            # Next.js middleware
├── supabase/
│   ├── migrations/              # SQL migrations
│   ├── functions/               # Edge Functions
│   │   └── send-reminders/      # Reminder function
│   └── config.toml              # Supabase config
├── docs/
│   └── project-logs/            # This documentation
└── public/                      # Static assets
```

---

## Database Schema

### Entity Relationship

```
profiles (1) ─────────────────── (n) challenges
    │                                   │
    │                                   │
    │                              (1)  │  (n)
    │                                   │
    └──────────── (n) daily_entries ────┤
                        │               │
                        │          (1)  │  (n)
                        │               │
                   (n)  │               │
                        │          tasks ───────────────┐
                task_completions                        │
                                                       │
                                              challenge_members
```

### Tables

| Table | Purpose | Key Fields |
|-------|---------|------------|
| `profiles` | User settings | timezone, reminder_enabled, reminder_time |
| `challenges` | Challenge definitions | name, start_date, duration_days, invite_token |
| `tasks` | Daily tasks | label, type (checkbox/number), target_value, unit |
| `daily_entries` | Daily check-ins | date, note, image_url, is_complete |
| `task_completions` | Task completion records | value, is_completed |
| `challenge_members` | Social connections | challenge_id, user_id |
| `fitness_providers` | Fitness app connections | provider, access_token, athlete_id, is_active |
| `fitness_activities` | Synced fitness data | activity_type, distance, duration, calories, raw_data |
| `fitness_task_mappings` | Task-activity links | task_id, activity_type, metric, multiplier |

### Row Level Security (RLS)

All tables have RLS enabled:
- Users can only read/write their own data
- Challenge members can see each other's high-level progress
- Challenge owners can manage members

---

## Authentication Flow

1. User visits `/auth`
2. Signs up with email/password (or magic link)
3. Supabase creates `auth.users` record
4. Trigger creates `profiles` record automatically
5. Middleware redirects to `/onboarding` for new users
6. After creating first challenge, redirects to `/dashboard`

---

## Key Design Decisions

### 1. App Router (Next.js 14)
- Using App Router for server components
- Protected routes in `(app)/` route group
- Layouts for shared UI (header, providers)

### 2. Optimistic Updates
- React Query handles cache updates
- UI updates immediately, rolls back on error

### 3. Middleware Strategy
- Only runs on protected routes (dashboard, challenge, etc.)
- Checks auth state via Supabase
- Redirects unauthenticated users to `/auth`

### 4. Invite System
- Each challenge has unique `invite_token`
- Shareable URLs: `/join/{token}`
- Token can be regenerated by owner

### 5. Reminder System
- User configures time + timezone in settings
- Edge Function runs every 5 minutes
- Checks if user's local time matches reminder time
- Sends email via Resend if no check-in for today

### 6. Fitness Integration System
- **OAuth Flow**: Secure token exchange via Supabase Edge Functions
- **Data Sync**: Automatic activity fetching from connected fitness providers
- **Auto-Population**: Intelligent task completion based on fitness metrics
- **Task Mapping**: Flexible linking between challenge tasks and activity types
- **Privacy-First**: User-controlled data sharing with explicit consent
- **Fallback Design**: Graceful degradation to manual entry

---

## Fitness Integration Architecture

### Supported Providers

**Strava (Primary)**
- REST API with OAuth 2.0 authentication
- Activity types: run, walk, ride, swim, hike, workout
- Metrics: distance, duration, calories, heart rate
- Rate limits: 100 requests/15min, 1000/day

**Apple Health (Future)**
- Requires native iOS app development
- HealthKit framework integration
- Direct device sensor access
- Not implemented due to web platform limitations

### Data Flow

```
User Action → OAuth Auth → Token Storage → Activity Sync → Metric Aggregation → Task Auto-Population
```

1. **User connects fitness account** via settings page
2. **OAuth flow** exchanges code for access/refresh tokens
3. **Tokens stored securely** in Supabase with encryption
4. **Background sync** fetches recent activities (last 30 days)
5. **Metrics aggregated** by activity type and date
6. **Check-in auto-populates** tasks based on fitness data
7. **Manual override** always available for adjustments

### Security Model

- **Row Level Security**: All fitness data scoped to authenticated user
- **Token Encryption**: OAuth tokens stored securely in database
- **Scoped Permissions**: Read-only access to activity data
- **User Consent**: Explicit authorization required for each provider
- **Data Minimization**: Only necessary fitness metrics stored

### Auto-Population Logic

**Task Completion Criteria:**
- Distance tasks: meters → kilometers conversion with multiplier
- Duration tasks: seconds → minutes conversion
- Steps/Calories: direct metric mapping
- Completion threshold: value ≥ target_value

**Example Mapping:**
```
Task: "Walk 5,000 steps"
Mapping: activity_type="walk", metric="steps", multiplier=1.0
Activities: walk (3,200 steps) + run (2,100 steps) = 5,300 steps
Result: Task auto-completed ✓
```

---

## Environment Variables

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=       # Supabase project URL
NEXT_PUBLIC_SUPABASE_ANON_KEY=  # Supabase anon key
SUPABASE_SERVICE_ROLE_KEY=      # For server-side operations

# Email & Notifications
RESEND_API_KEY=                 # For email reminders
NEXT_PUBLIC_APP_URL=            # App URL for emails

# Fitness Integration (Supabase Secrets for Edge Functions)
STRAVA_CLIENT_ID=               # Strava OAuth client ID
STRAVA_CLIENT_SECRET=           # Strava OAuth client secret
```

---

## Deployment

The app is designed to be deployed to:
- **Vercel** - Frontend (recommended)
- **Supabase** - Backend (already configured)

Environment variables need to be set in both platforms.

