# Known Issues & Future Improvements

This document tracks known bugs, issues, and planned improvements for the 75 Hard Challenge Tracker.

---

## Current Issues

### High Priority

| Issue | Description | Status |
|-------|-------------|--------|
| None currently | - | - |

### Medium Priority

| Issue | Description | Status |
|-------|-------------|--------|
| Reminder email sender | Need to configure actual Resend domain (currently placeholder) | TODO |
| Task reordering | Drag-and-drop UI exists but needs DnD library integration | TODO |

### Medium Priority

| Issue | Description | Status |
|-------|-------------|--------|
| Reminder email sender | Need to configure actual Resend domain (currently placeholder) | TODO |
| Task reordering | Drag-and-drop UI exists but needs DnD library integration | TODO |
| Strava OAuth setup | Requires Strava app creation and credentials configuration | TODO |

### Low Priority

| Issue | Description | Status |
|-------|-------------|--------|
| Security lint warning | `handle_new_user` function has mutable search_path | TODO |
| Apple Health limitation | Cannot integrate via web - requires native iOS app | KNOWN LIMITATION |

---

## Future Improvements

### Features to Add

- [ ] **Push notifications** - Web push for reminders
- [ ] **Dark/Light mode toggle** - Currently dark-only
- [ ] **Export data** - CSV/JSON export of progress
- [ ] **Challenge templates gallery** - Pre-made challenge templates
- [ ] **Progress sharing** - Share progress to social media
- [ ] **Weekly/monthly summaries** - Email digest of progress
- [ ] **Badges/achievements** - Gamification elements
- [ ] **Notes history** - View all past notes
- [ ] **Photo gallery** - View all progress photos
- [ ] **Apple Health integration** - Native iOS app for HealthKit access
- [ ] **Additional fitness APIs** - Fitbit, Garmin, Google Fit support
- [ ] **Fitness trend analytics** - Charts and insights from activity data
- [ ] **Smart task suggestions** - AI-powered fitness goal recommendations

### Technical Improvements

- [ ] **E2E tests** - Playwright tests for critical flows
- [ ] **Error monitoring** - Sentry integration
- [ ] **Analytics** - Track user engagement
- [ ] **PWA support** - Offline capability
- [ ] **Rate limiting** - API protection
- [ ] **Image optimization** - Compress uploaded photos

---

## Resolved Issues

| Issue | Description | Resolution | Date |
|-------|-------------|------------|------|
| API key error | App showed "Invalid API key" JSON | Fixed by killing stale processes on port 3000 | Nov 26, 2025 |
| Missing geist font | Build error due to missing package | Installed `geist` package | Nov 26, 2025 |

---

## Fitness Integration Notes

### Current Implementation
- **Strava Integration**: ✅ Fully implemented with OAuth 2.0 and activity syncing
- **Automatic Sync**: ✅ Hourly automatic sync for all active Strava connections
- **Auto-Population**: ✅ Automatic task completion based on unit recognition
- **Unit Matching**: ✅ Intelligent matching of task units to fitness metrics
- **Simplified UX**: ✅ No manual mapping required - works automatically

### Known Limitations
- **Apple Health**: Cannot be implemented via web app due to iOS-only APIs
- **Strava Rate Limits**: 100 requests/15min, 1000/day (handled gracefully with sequential processing)
- **Data Sync**: Only syncs activities from last 30 days (keeps database size manageable)
- **Unit Recognition**: Limited to supported units (distance, time, steps, calories)
- **Automatic Sync**: Requires external cron service or pg_cron extension (not available on free tier)

### Privacy & Security
- All fitness data encrypted and scoped to authenticated users
- OAuth tokens stored securely with automatic refresh
- Users have full control over data sharing and can disconnect anytime
- No automatic data collection without explicit user consent

### Performance Considerations
- Fitness sync happens in background and doesn't block check-ins
- Activity aggregation optimized for common use cases
- React Query caching prevents unnecessary API calls
- Graceful fallback to manual entry when fitness data unavailable

### Performance Optimizations (Dec 2025)

**Implemented optimizations for faster page loads:**

1. **Centralized Auth Context**
   - Single auth state management in `Providers` component
   - Eliminated 4-5 redundant `getUser()` calls per page load
   - Auth state shared across all hooks via React Context

2. **Optimized React Query Configuration**
   - `staleTime`: 5 minutes (data doesn't change often)
   - `gcTime`: 30 minutes (keep cache longer)
   - `refetchOnMount`: false (use cached data)
   - `retry`: 1 (fail faster)

3. **Parallel Data Fetching**
   - `useChallenges`: Fetches owned + member challenges in parallel
   - `useProgressStats`: Fetches challenge + entries in parallel
   - `useCalendarDays`: Fetches challenge + entries in parallel
   - `useChallengeMembers`: Batch fetches all member entries

4. **Optimized Dashboard**
   - New `useChallengesWithStats` hook fetches ALL data in 2-3 queries
   - Eliminates N+1 problem (was 1 + N queries, now constant)
   - Stats calculated client-side from batched data

5. **Database Indexes**
   - Migration `005_performance_indexes.sql` adds indexes for:
     - `challenges(user_id)`
     - `tasks(challenge_id)`
     - `daily_entries(challenge_id, user_id, date)`
     - `task_completions(daily_entry_id)`
     - `challenge_members(challenge_id, user_id)`
     - `fitness_activities(user_id, start_date)`

**Expected Results:**
- Auth calls: 5+ → 1
- Dashboard queries: 6-8+ → 2-3
- Time to interactive: ~50-70% faster

---

## How to Report Issues

When adding a new issue:

1. Add it to the appropriate priority section above
2. Include:
   - Clear description of the problem
   - Steps to reproduce (if applicable)
   - Expected vs actual behavior
3. Update status as work progresses: TODO → IN PROGRESS → RESOLVED

---

## Testing Notes

### Manual Testing Checklist

Before deploying, verify:

- [ ] Sign up creates account and profile
- [ ] Sign in works with email/password
- [ ] Magic link auth works
- [ ] Challenge creation saves all tasks
- [ ] Daily check-in persists data
- [ ] Image upload works
- [ ] Progress calendar shows correct status
- [ ] Streaks calculate correctly
- [ ] Invite links work
- [ ] Friend can see shared challenge
- [ ] Settings save correctly
- [ ] Reminder time respects timezone
- [ ] Strava OAuth connection works
- [ ] Fitness activities sync correctly
- [ ] Task auto-population from fitness data
- [ ] Fitness task mappings save and apply
- [ ] Manual override of auto-populated tasks
- [ ] Disconnect fitness account removes data
- [ ] Automatic hourly sync runs successfully

