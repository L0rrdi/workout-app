# Workout App Handoff (v5)
## Who I am
I am a beginner building my first full-stack web app. I need step-by-step guidance, including exact commands to run in PowerShell.

## Project goal
A workout tracking app where users can paste workout text, parse it into structured data, save it, and view it. Auth is done. Multiple users supported.

## Repo
https://github.com/L0rrdi/workout-app

## How you must help me
You MUST:
- Give exact file paths
- Give full file contents when editing files
- Tell me exactly what to type in PowerShell when needed
- Build things step by step
- Keep explanations short and clear
- Keep code beginner-friendly

You MUST NOT:
- Rewrite the whole project at once
- Introduce unnecessary libraries
- Overcomplicate things

## Tech stack (fixed)
- SvelteKit (Svelte 5 — uses $state(), onclick, not on:click)
- TypeScript
- TailwindCSS
- Cloudflare Workers (deployed)
- Cloudflare D1 (database, live)
- npm
- Chart.js (installed, used on /progress page)

## Important Svelte 5 rules
- Use `$state()` for all reactive variables — NOT plain `let`
- Use `$derived()` for computed values
- Use `$effect()` for side effects
- Use `onclick={handler}` — NOT `on:click`
- Use `<textarea></textarea>` — NOT self-closing `<textarea />`
- Use `{#each items as item (item.id)}` — always include a key
- Use `import { page } from '$app/state'` — NOT `$app/stores` (deprecated)
- Use `page.params.id` — NOT `$page.params.id`
- Use `SvelteMap` from `svelte/reactivity` instead of `new Map()` inside `$derived`
- Avoid `new Date()` mutation inside `$derived` — use timestamp arithmetic or `Intl.DateTimeFormat`

## Important PowerShell rules
- Folders with brackets like `[id]` must always be quoted: `"src\routes\[id]"`
- Use `Set-Content` without `-Encoding UTF8` (this version doesn't support it)
- When pasting long files into VS Code, always Ctrl+A then Delete first
- If pasting fails, use the `@' ... '@ | Set-Content path` PowerShell method

## Deploy issue — locked folder
If `npm run build` fails with `EPERM .svelte-kit\cloudflare`, run:
```
taskkill /F /IM node.exe
rd /s /q C:\Users\nosvi\workout-app\.svelte-kit\cloudflare
npm run build
npx wrangler deploy
```

## What is already built
All of the following is complete and working:

### Auth — `src/lib/auth.ts`
- Google OAuth 2.0 login flow
- Sessions stored in D1 `sessions` table (30-day persistent cookies)
- `getUser(request, db)` — checks `Authorization: Bearer <token>` first, then falls back to session cookie
- `getSessionId(request)` — reads raw session ID from cookie header
- `ADMIN_EMAIL = 'nosviland@gmail.com'` — used for admin badge
- User interface: `{ id, google_id, email, name, picture, created_at }`
- OAuth state parameter used (CSRF protection)
- Fetch timeouts on Google API calls (10s)
- Expired sessions deleted on every login
- API token auto-generated on every first login (INSERT OR IGNORE)

### Auth routes
- `GET /auth/google` — redirects to Google OAuth with state param
- `GET /auth/google/callback` — handles code exchange, creates session, sets cookie, auto-generates API token
- `GET /auth/logout` — deletes session from DB, clears cookie, redirects to /login

### API token system
- `api_tokens` table: `(id, user_id UNIQUE, token UNIQUE, created_at)`
- Token format: `wkt_` + 32 hex chars
- Auto-generated on first Google login (never overwrites existing)
- `GET /api/auth/token` — returns current token (session auth only)
- `POST /api/auth/token` — generates/replaces token (session auth only)
- All `/api/workouts` endpoints accept `Authorization: Bearer <token>` for future iOS app use

### Layout server load — `src/routes/+layout.server.ts`
- Runs on every page load
- Redirects unauthenticated users to `/login` (except `/login` and `/auth` routes)
- Passes `user` to layout

### Security
- `src/hooks.server.ts` — sets `X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy` headers
- `handleError` logs errors with method + path to Cloudflare logs

### Parser module — `src/lib/parser.ts`
- Parses workout text into structured exercises
- Handles: `Bench Press 3x8 60kg`, `Squat 5 x 5 100 kg`, `Pull ups 3x10`, `Curl 12kg 3x12`
- Header lines like "Push Day" are silently skipped
- Exports: `ParsedExercise`, `ParseError`, `ParseResult`, `WeightUnit`, `parseLine()`, `parseText()`
- Do NOT touch this file unless explicitly asked

### Storage module — `src/lib/storage.ts`
- `Workout` interface: `{ id, title, date, notes: string | null, exercises: ParsedExercise[] }`
- API functions: `fetchWorkouts()`, `createWorkout()`, `updateWorkout()`, `removeWorkout()`, `bulkCreateWorkouts()`
- `generateId()` helper

### API endpoints (all support session cookie OR Bearer token auth)
- `GET /api/workouts` — fetches all workouts for the logged-in user (2 queries, no N+1)
- `POST /api/workouts` — creates workout with `user_id`, supports `notes` field
- `PUT /api/workouts/[id]` — updates workout title, date, notes, exercises (checks ownership)
- `DELETE /api/workouts/[id]` — verifies ownership, deletes exercises first, then workout
- `DELETE /api/workouts` — deletes ALL workouts for the user (used by Settings page)
- `POST /api/workouts/bulk` — bulk insert with `user_id`
- `GET /api/templates` — fetch all templates for user
- `POST /api/templates` — save new template `{ title, exercises }`
- `DELETE /api/templates?id=xxx` — delete a template

### Pages
- `/login` — "Sign in with Google" button, no nav shown
- `/` — home page. Shows workout count + streak (2+ days). Links to /import and /workouts
- `/import` — textarea, parse button, editable preview, save to database. Has "Bulk import" link top-right
- `/import/bulk` — 3-step flow: copy AI prompt → paste JSON → set date range → preview → import
- `/workouts` — lists all workouts. Day filter (All/Push/Pull/Legs/Other), search by title or exercise, relative dates (Today/Yesterday/N days ago), weekly volume summary, confirm-before-delete. Import + New buttons top-right
- `/workouts/new` — form-based workout entry: title, date, notes, exercises (name/sets/reps/weight/unit). Templates picker button top-right if templates exist
- `/workouts/[id]` — detail page. Shows PR badge (amber) on all-time best weight exercises. Shows total volume. Notes section. "Use as template" button + Edit button
- `/progress` — Chart.js line graph. Clicking a dot navigates to that workout. Filter by Day type, exercise dropdown, period tabs (All/Year/Month/Week/Day). Total sets counter for selected exercise below period tabs. Recent sessions list
- `/profile` — shows Google avatar, name, email, date joined. Admin badge (red) for nosviland@gmail.com. Sign out button
- `/records` — personal records page. All-time best weight per exercise, alphabetically sorted, searchable. Each row links to the workout where the PR was set
- `/settings` — Delete all workouts button with inline confirm prompt

### Layout & Nav
- `src/routes/+layout.svelte` — fixed top nav, dark themed. Hidden on /login
- Nav links: Workouts | Progress | Import | + Add | avatar dropdown
- Avatar dropdown (hover): Profile | Records | Settings
- Active nav: Workouts on `/workouts*`, Progress on `/progress*`, Import filled-white on `/import`, + Add filled-white on `/workouts/new`
- Page fade-in animation via `.page-fade` class in `layout.css`

### Workout templates
- Stored in `templates` table: `(id, user_id, title, exercises JSON, created_at)`
- "Use as template" button on `/workouts/[id]` — saves current workout's title + exercises as a template
- On `/workouts/new` — "Templates" button appears if templates exist, shows list with Use + Delete per template
- Applying a template fills in the title and exercises instantly

### Database
- Cloudflare D1, database name: `workout-app-db`
- Tables:
  - `workouts (id, title, date, notes, user_id)`
  - `exercises (id, workout_id, name, sets, reps, weight, unit, raw)`
  - `users (id, google_id, email, name, picture, created_at)`
  - `sessions (id, user_id, expires_at)`
  - `api_tokens (id, user_id UNIQUE, token UNIQUE, created_at)`
  - `templates (id, user_id, title, exercises TEXT, created_at)`
- Migrations: `0001` through `0006` all applied locally and remotely

### Secrets (Cloudflare Workers env vars)
- `GOOGLE_CLIENT_ID` — Google OAuth client ID
- `GOOGLE_CLIENT_SECRET` — Google OAuth client secret
- `SESSION_SECRET` — random 32-byte hex string
- Local dev: stored in `.dev.vars` (gitignored)

### Deployment
- Live at: https://workout-app.nosviland.workers.dev
- Config: `wrangler.json` with `nodejs_compat` flag
- Adapter: `@sveltejs/adapter-cloudflare`

## Design system (all pages use this)
- Dark background: `bg-neutral-950`
- Primary text: `text-white`
- Secondary text: `text-white/70`, `text-white/50`, `text-white/40`, `text-white/30`
- Cards/panels: `bg-white/5 border border-white/10`
- Inputs: `bg-white/5 border border-white/10 text-white placeholder:text-white/30`
- Primary buttons: `bg-white text-neutral-950 hover:bg-white/90 active:bg-white/75`
- Secondary buttons: `bg-white/5 border border-white/10 text-white/70 hover:bg-white/10`
- Labels: `text-xs font-medium text-white/40 uppercase tracking-wide`
- Date inputs: add `scheme-dark` class
- No `transition-all`, no blue/indigo as primary color
- Every clickable element needs hover, focus-visible, and active states
- Empty states: icon + short message + CTA button (see /workouts and /progress for reference)
- PR badge: `bg-amber-500/15 text-amber-400 border border-amber-500/25`
- Admin badge: `bg-red-500/20 text-red-400 border border-red-500/30`

## File structure
```
src/
  lib/
    auth.ts
    parser.ts
    storage.ts
  routes/
    +layout.svelte
    +layout.server.ts
    +page.svelte
    layout.css
    hooks.server.ts (at src/ level)
    auth/
      google/
        +server.ts
        callback/
          +server.ts
      logout/
        +server.ts
    api/
      auth/
        token/
          +server.ts
      workouts/
        +server.ts
        [id]/
          +server.ts
        bulk/
          +server.ts
      templates/
        +server.ts
    import/
      +page.svelte
      bulk/
        +page.svelte
    login/
      +page.svelte
    profile/
      +page.svelte
      +page.server.ts
    records/
      +page.svelte
    settings/
      +page.svelte
    workouts/
      +page.svelte
      new/
        +page.svelte
      [id]/
        +page.svelte
    progress/
      +page.svelte
migrations/
  0001_create_workouts.sql
  0002_add_auth.sql
  0003_add_user_picture.sql
  0004_add_api_tokens.sql
  0005_add_workout_notes.sql
  0006_add_templates.sql
wrangler.json
svelte.config.js
frontend_rules.md
.dev.vars (gitignored — local secrets)
```

## How to run locally
```
npm run dev
```
App runs at http://localhost:5173 (or 5174 if 5173 is taken)

## How to deploy
```
npm run build
npx wrangler deploy
```
Run these in the project folder (`cd C:\Users\nosvi\workout-app` first).
Stop the dev server (Ctrl+C) OR open a second terminal for build/deploy.

## How to run a DB migration
```
npx wrangler d1 execute workout-app-db --local --file=migrations/XXXX_name.sql
npx wrangler d1 execute workout-app-db --remote --file=migrations/XXXX_name.sql
```
Always run both — local for dev, remote for production.

## Notes
- Do NOT touch parser.ts unless explicitly asked
- Always check for Svelte 5 syntax issues before finishing a file
- The assistant goes by the name "Jarvis" in this project
- Google OAuth consent screen is published (not in testing mode)
- Any Google account can sign up — no allowlist
- Existing workouts without user_id are orphaned (pre-auth data)
