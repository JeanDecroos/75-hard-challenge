# 75 Hard Challenge Tracker

A beautiful, full-featured web application for creating and tracking customizable "75 Hard style" challenges. Built with Next.js, Supabase, and shadcn/ui.

![75 Hard Challenge Tracker](https://via.placeholder.com/800x400?text=75+Hard+Challenge+Tracker)

## ✨ Features

- **Customizable Challenges**: Start with the default 75 Hard template or create your own
- **Daily Check-ins**: Track checkbox and numeric tasks with notes and progress photos
- **Progress Analytics**: Beautiful calendar view, streak tracking, and completion stats
- **Social Features**: Invite friends to join your challenge and see each other's progress
- **Daily Reminders**: Email reminders via Resend when you haven't checked in
- **Mobile-First Design**: Responsive, clean UI built with shadcn/ui

## 🛠️ Tech Stack

- **Frontend**: Next.js 14 (App Router), TypeScript, Tailwind CSS
- **UI Components**: shadcn/ui, Radix UI, Framer Motion
- **Backend**: Supabase (PostgreSQL, Auth, Storage, Edge Functions)
- **Email**: Resend for transactional emails
- **State Management**: React Query (TanStack Query)

## 🚀 Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn or bun
- Supabase CLI
- A Supabase project
- A Resend account (for email reminders)

### 1. Clone and Install

```bash
git clone <repository-url>
cd 75HardChallenge
npm install
```

### 2. Set Up Supabase

1. Create a new project at [supabase.com](https://supabase.com)
2. Get your project URL and anon key from Project Settings > API
3. Copy `env.example` to `.env.local` and fill in your credentials:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
RESEND_API_KEY=your_resend_api_key
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 3. Run Database Migrations

Using Supabase CLI:

```bash
supabase link --project-ref your-project-ref
supabase db push
```

Or manually run the SQL in `supabase/migrations/001_initial_schema.sql` via the Supabase SQL Editor.

### 4. Deploy Edge Functions

```bash
supabase functions deploy send-reminders
```

Set the required secrets:

```bash
supabase secrets set RESEND_API_KEY=your_resend_api_key
supabase secrets set CRON_SECRET=your_cron_secret
supabase secrets set APP_URL=https://your-app-url.com
```

### 5. Set Up Scheduled Reminders

The reminder function needs to be called periodically (every 5 minutes recommended). Options:

**Option A: Using pg_cron (Supabase Pro)**
```sql
SELECT cron.schedule(
  'send-daily-reminders',
  '*/5 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://YOUR_PROJECT.supabase.co/functions/v1/send-reminders',
    headers := '{"Authorization": "Bearer YOUR_CRON_SECRET"}'::jsonb
  );
  $$
);
```

**Option B: External Cron Service**
Use GitHub Actions, Vercel Cron, or any cron service to call the endpoint every 5 minutes.

### 6. Start Development Server

```bash
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000)

## 📚 Project Logs & Context

For returning developers or AI assistants, see `docs/project-logs/` for:
- **SESSION_LOG.md** - Chronological development history with prompts
- **ARCHITECTURE.md** - Technical decisions and structure
- **KNOWN_ISSUES.md** - Bugs and planned improvements

> **Tip:** When starting a new session, share the project logs folder with your AI to provide full context.

---

## 📁 Project Structure

```
75HardChallenge/
├── docs/
│   └── project-logs/           # Development history & context
├── src/
│   ├── app/                    # Next.js App Router pages
│   │   ├── (app)/             # Protected routes
│   │   │   ├── dashboard/     # Dashboard page
│   │   │   ├── challenge/     # Challenge pages
│   │   │   └── settings/      # User settings
│   │   ├── auth/              # Authentication pages
│   │   ├── join/              # Invite link handling
│   │   └── onboarding/        # Challenge creation
│   ├── components/
│   │   ├── ui/                # shadcn/ui components
│   │   ├── app-header.tsx     # Main navigation
│   │   └── providers.tsx      # React Query provider
│   ├── hooks/                 # Custom React hooks
│   │   ├── use-auth.ts        # Authentication hook
│   │   ├── use-challenges.ts  # Challenge data hooks
│   │   ├── use-tasks.ts       # Task management hooks
│   │   └── use-progress.ts    # Progress/stats hooks
│   ├── lib/
│   │   ├── supabase/          # Supabase client config
│   │   └── utils.ts           # Utility functions
│   └── types/                 # TypeScript types
├── supabase/
│   ├── migrations/            # Database migrations
│   └── functions/             # Edge Functions
├── public/                    # Static assets
└── package.json
```

## 🎨 Customization

### Theme Colors

Edit the CSS variables in `src/app/globals.css`:

```css
:root {
  --primary: 142 71% 45%;  /* Green accent */
  --background: 0 0% 3%;   /* Dark background */
  /* ... more variables */
}
```

### Default Challenge Template

Edit the default tasks in `src/types/index.ts`:

```typescript
export const DEFAULT_TASKS: DefaultTask[] = [
  {
    label: 'Read 10 pages',
    type: 'number',
    target_value: 10,
    unit: 'pages',
    is_required: true,
    position: 0,
  },
  // Add more tasks...
]
```

## 📧 Email Configuration

1. Sign up at [resend.com](https://resend.com)
2. Verify your domain for sending emails
3. Update the `from` address in the Edge Function
4. Add your API key to environment variables

## 🔒 Security

- Row Level Security (RLS) policies protect all data
- Users can only access their own challenges and entries
- Challenge members can see each other's high-level progress
- Invite tokens are randomly generated and can be regenerated

## 🚢 Deployment

### Vercel (Recommended)

1. Push to GitHub
2. Import to Vercel
3. Add environment variables
4. Deploy!

### Environment Variables for Production

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=xxx
SUPABASE_SERVICE_ROLE_KEY=xxx
RESEND_API_KEY=xxx
NEXT_PUBLIC_APP_URL=https://your-domain.com
```

## 📝 License

MIT License - feel free to use this for your own projects!

## 🤝 Contributing

Contributions are welcome! Please open an issue or PR.

---

Built with ❤️ using Next.js, Supabase, and shadcn/ui

