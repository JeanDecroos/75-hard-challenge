# 75 Hard Challenge Tracker - Project Logs

This folder contains a living record of the project's development, including prompts, decisions, and implementation details. It serves as context for future development sessions.

## Purpose

When returning to this project after time away, this documentation helps:
- Understand what has been built and why
- Know the original goals and requirements
- Pick up where development left off
- Maintain consistency in coding style and architecture

## Project Overview

**Project Name:** 75 Hard Challenge Tracker  
**Started:** November 26, 2025  
**Tech Stack:** Next.js 14 (App Router), TypeScript, Tailwind CSS, shadcn/ui, Supabase, Resend

### Core Concept
A web application for creating and tracking customizable "75 Hard style" challenges - a personal development program where users complete daily tasks for a set number of days (default 75).

### Key Features
- Customizable challenge templates
- Daily check-in system with checkbox and numeric tasks
- Progress photos upload
- Calendar visualization
- Streak tracking
- Social features (invite friends to challenges)
- Email reminders via Resend

## File Structure

```
docs/project-logs/
├── README.md           # This file - project overview
├── SESSION_LOG.md      # Chronological log of all development sessions
├── ARCHITECTURE.md     # Technical architecture decisions
└── KNOWN_ISSUES.md     # Bugs and issues to address
```

## How to Update

After each development session:
1. Add a new entry to `SESSION_LOG.md` with date, prompts, and changes made
2. Update `ARCHITECTURE.md` if any structural changes were made
3. Add any new issues to `KNOWN_ISSUES.md`

## Quick Context for AI

When starting a new session, share this with the AI:
> "I'm working on a 75 Hard Challenge Tracker app. Please read the files in `docs/project-logs/` for context on what has been built and the project goals."

