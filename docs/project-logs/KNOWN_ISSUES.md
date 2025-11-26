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

### Low Priority

| Issue | Description | Status |
|-------|-------------|--------|
| Security lint warning | `handle_new_user` function has mutable search_path | TODO |

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

