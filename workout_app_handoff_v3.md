# Workout App Handoff (v9)
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
- `{@const}` must be a direct child of a block tag (`{#if}`, `{#each}`, etc.) — NOT inside a plain `<div>`

## Important PowerShell rules
- Folders with brackets like `[id]` must always be quoted: `"src\routes\[id]"`
- Use `Set-Content` without `-Encoding UTF8` (this version doesn't support it)
- When pasting long files into VS Code, always Ctrl+A then Delete first
- If pasting fails, use the `@' ... '@ | Set-Content path` PowerShell method
- To edit files with tricky whitespace, use Python one-liners: `python -c "content = open(r'path').read(); content = content.replace('old', 'new'); open(r'path', 'w').write(content)"`

## Deploy issue — locked folder
If `npm run build` fails with `EPERM .svelte-kit\cloudflare`, run:
```
Remove-Item -Recurse -Force .svelte-kit\cloudflare
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
- Admin email is NOT hardcoded — read from `platform.env.ADMIN_EMAIL` in each server file that needs it (stored as Cloudflare secret + in `.dev.vars` for local)
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
- Passes `user` and `isAdmin` to layout

### Security
- `src/hooks.server.ts` — sets `X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`, `Content-Security-Policy` headers
- CSP allows: `'self'`, inline scripts/styles (needed by SvelteKit), Google profile images (`lh3.googleusercontent.com`)
- `handleError` logs errors with method + path to Cloudflare logs
- All API endpoints that touch workouts/exercises verify ownership via `WHERE user_id = ?` OR an explicit ownership `SELECT` before any writes (PUT `/api/workouts/[id]` now checks ownership before the UPDATE/DELETE — previously the DELETE could wipe another user's exercises)
- `POST /api/workouts/bulk` — max 500 workouts per request (returns 400 if exceeded)
- Number inputs (`type="number"`) block `e`, `E`, `+`, `-` via `onkeydown` on desktop; integer-only fields (reps/sets/minutes/seconds) also block `.`. Mobile keyboards unaffected (they use `inputmode`)

### Parser module — `src/lib/parser.ts`
- Parses workout text into structured exercises
- Handles: `Bench Press 3x8 60kg`, `Squat 5 x 5 100 kg`, `Pull ups 3x10`, `Curl 12kg 3x12`
- Header lines like "Push Day" are silently skipped
- Exports: `ParsedExercise`, `ParseError`, `ParseResult`, `WeightUnit`, `parseLine()`, `parseText()`
- Do NOT touch this file unless explicitly asked

### Storage module — `src/lib/storage.ts`
- `SetRow` interface: `{ reps: number; weight: number | null }`
- `ExerciseWithSetData` interface: extends `ParsedExercise` with optional `set_data?: string | null`
- `Workout` interface: `{ id, title, date, notes: string | null, tag?: string | null, exercises: ExerciseWithSetData[] }`
- API functions: `fetchWorkouts()`, `createWorkout()`, `updateWorkout()`, `removeWorkout()`, `bulkCreateWorkouts()`
- `generateId()` helper

### API endpoints (all support session cookie OR Bearer token auth)
- `GET /api/workouts` — fetches all workouts for the logged-in user (2 queries, no N+1)
- `POST /api/workouts` — creates workout with `user_id`, supports `notes`, `tag`, and `set_data` fields
- `GET /api/workouts/[id]` — fetches a single workout with exercises; admin can access any user's workout
- `PUT /api/workouts/[id]` — updates workout title, date, notes, tag, exercises, set_data (checks ownership)
- `DELETE /api/workouts/[id]` — verifies ownership, deletes exercises first, then workout
- `DELETE /api/workouts` — deletes ALL workouts for the user (used by Settings page)
- `POST /api/workouts/bulk` — bulk insert with `user_id`, supports `tag` and `set_data`. Rejects requests with > 500 workouts (returns 400)
- `GET /api/templates` — fetch all templates for user
- `POST /api/templates` — save new template `{ title, exercises }`
- `PUT /api/templates?id=xxx` — update template title + exercises
- `DELETE /api/templates?id=xxx` — delete a template
- `DELETE /api/admin/users/[id]` — admin only: deletes user + all their data

### Pages
- `/login` — "Sign in with Google" button, no nav shown
- `/` — home page. Title "Workout tracking". Shows workout count + streak (2+ days). "+ New workout" button → /workouts/new. "View workouts" button → /workouts
- `/import` — textarea, parse button, editable preview, save to database. Has "Bulk import" link top-right
- `/import/bulk` — 3-step flow: copy AI prompt → paste JSON → set date range → preview → import. Prompt instructs the AI to output max 500 workouts and append `// CONTINUED` if truncated so user can do multiple batches
- `/workouts` — lists all workouts. Tag badge shown next to workout title. Day filter (All/Push/Pull/Legs/Other), search by title or exercise, relative dates (Today/Yesterday/N days ago), weekly volume summary, confirm-before-delete. Import + New buttons top-right
- `/workouts/new` — form-based workout entry: title, date, notes, tag picker, exercises with per-set reps+weight rows. Shows "X last" hint below each reps/weight input (matches by exercise name+weight, prefers same tag). Templates picker button top-right if templates exist. Cardio form shown when Cardio tag selected. Auto-saves draft to localStorage every 3s; "Draft" badge + "Discard draft" button shown when draft exists; draft cleared on successful save. Exercises can be drag-reordered via ⠿ handle (HTML5 DnD on desktop, touch events on mobile)
- `/workouts/[id]` — detail page. Tag badge shown next to date. Shows PR badge (amber) on all-time best weight exercises. Shows total volume. Notes section. Per-set display if set_data exists. Cardio display (distance/time/pace) for Cardio tag. "Use as template" button + Edit button. Admin can view any user's workout. Edit mode supports exercise drag-reorder via ⠿ handle (same implementation as /workouts/new)
- `/progress` — Chart.js line graph. Weight/Reps metric toggle. Clicking a dot navigates to that workout. Filter by Day type, Tag (shown when tagged workouts exist), exercise dropdown, period tabs (All/Year/Month/Week/Day). Total sets counter. Recent sessions list. Reps mode shows reps at heaviest set
- `/profile` — shows Google avatar, name, email, date joined. Admin badge (red) for nosviland@gmail.com. Sign out button
- `/records` — personal records page. All-time best weight per exercise, alphabetically sorted, searchable. Tag filter buttons (All / Strength / Hypertrophy / Cardio) appear when tagged workouts exist — filters PRs to only those achieved in workouts of that tag. Each row links to the workout where the PR was set
- `/settings` — Delete all workouts button with inline confirm prompt
- `/admin` — admin-only console. Stats (users/workouts/exercises), top exercises chart, full user table with workout counts. Each user row links to drill-down. Accessible via avatar dropdown (Console link, red, admin only)
- `/admin/users/[id]` — per-user drill-down. Profile card, workout count, join date, full workout list. Delete user button with inline confirm (deletes all user data)

### Layout & Nav
- `src/routes/+layout.svelte` — fixed top nav, dark themed. Hidden on /login
- **Desktop**: Workouts | Progress | Import | + New | avatar dropdown
- **Mobile**: hamburger button (animates to X) → slide-down menu with all links + profile section
- Avatar dropdown (hover, desktop only): Profile | Records | Settings | Console (admin only, red)
- Active nav: Workouts on `/workouts*`, Progress on `/progress*`, Import filled-white on `/import`, + New filled-white on `/workouts/new`
- Page fade-in animation via `.page-fade` class in `layout.css`
- `html, body { background-color: #0a0a0a }` in `layout.css` — prevents white overscroll on mobile

### Workout tags
- Tags: `Strength`, `Hypertrophy`, `Cardio` — stored as `tag TEXT` column on `workouts` table
- Tag picker shown on `/workouts/new` and edit mode of `/workouts/[id]`
- Tag badge shown on workout list (`/workouts`) and detail page (`/workouts/[id]`)
- Tag filter row on `/progress` — only visible when at least one tagged workout exists
- Selecting a tag is optional; workouts can have no tag

### Cardio workouts
- Triggered by selecting the "Cardio" tag on `/workouts/new` or edit
- Form shows: Activity name (default "Run"), Distance (km), Time (minutes + seconds)
- Live pace calculation displayed as `M:SS/km`
- Stored as a single exercise row: `name = activity`, `set_data = {"cardio":true,"distanceKm":X,"timeSeconds":Y}`
- Cardio exercises display as `X km · M:SS · P:PP/km` on list and detail pages
- `totalVolume` skips cardio exercises (weight is null)
- PR tracking skips cardio exercises (weight is null)

### Last workout reference (on /workouts/new)
- When typing an exercise name, each set shows faint hints below the inputs:
  - `X last` below the reps input — reps at matching weight from last workout
  - `Xkg last` below the weight input — weight at matching set index from last workout
- Matching: prefers workouts with same tag, falls back to any workout if none found
- Skips cardio exercises (non-array set_data)

### Per-set exercise data
- Each exercise can store per-set reps + weight via `set_data TEXT` column (JSON array of `{reps, weight}`)
- `sets` = number of set rows, `weight` = max weight across sets (used for PR tracking)
- Old exercises without `set_data` still display correctly using `sets × reps · weight`
- New workout form and edit mode both show individual set rows with "+ Add set" / remove buttons

### Workout templates
- Stored in `templates` table: `(id, user_id, title, exercises JSON, created_at)`
- Template exercises shape: `{ name, sets, reps, weight: number | null, unit: string | null }[]`
- "Use as template" button on `/workouts/[id]` — saves current workout's title + exercises as a template
- On `/workouts/new` — "Templates" button appears if templates exist (hidden when Cardio tag selected)
- Template list shows: Use, Edit, Delete buttons per template
- Edit opens an inline form (title + per-exercise name/sets/reps/weight/unit) — saves via `PUT /api/templates?id=`
- Applying a template fills in the title and exercises instantly

### Draft auto-save (on /workouts/new)
- Form state saved to localStorage key `workout_draft` every 3 seconds
- On page load: draft is restored automatically if one exists
- "Draft" pill badge shown in header when a draft is active
- "Discard draft" button resets the form to defaults and clears localStorage
- Draft is removed from localStorage on successful workout save
- Max 1 draft at a time (always overwrites the previous)

### Exercise drag-reorder
- Available on `/workouts/new` and `/workouts/[id]` (edit mode)
- Each exercise card has a `⠿` drag handle on the left
- Desktop: HTML5 `draggable` + `dragstart/dragover/drop/dragend` events
- Mobile: `touchstart` on the handle; document-level `touchmove`/`touchend` handlers use `elementFromPoint` to find the drop target
- Visual feedback: dragged card is dimmed (opacity-50), drop target gets a brighter border
- Touch handlers are registered in `onMount` and cleaned up in `onDestroy`

### Mobile numeric keyboard
- All `type="number"` inputs use `inputmode` to show the correct mobile keyboard:
  - `inputmode="numeric"` — reps, sets, minutes, seconds (integer fields)
  - `inputmode="decimal"` — weight, distance (decimal fields)
- Applied on `/workouts/new` and `/workouts/[id]`

### Database
- Cloudflare D1, database name: `workout-app-db`
- Tables:
  - `workouts (id, title, date, notes, tag, user_id)`
  - `exercises (id, workout_id, name, sets, reps, weight, unit, raw, set_data)`
  - `users (id, google_id, email, name, picture, created_at)`
  - `sessions (id, user_id, expires_at)`
  - `api_tokens (id, user_id UNIQUE, token UNIQUE, created_at)`
  - `templates (id, user_id, title, exercises TEXT, created_at)`
- Migrations: `0001` through `0008` all applied locally and remotely
  - `0008_add_workout_tag.sql` — adds `tag TEXT` to workouts

### Secrets (Cloudflare Workers env vars)
- `GOOGLE_CLIENT_ID` — Google OAuth client ID
- `GOOGLE_CLIENT_SECRET` — Google OAuth client secret
- `SESSION_SECRET` — random 32-byte hex string
- `ADMIN_EMAIL` — email address that gets admin privileges (e.g. Console, delete users)
- Local dev: stored in `.dev.vars` (gitignored)
- Typed on `App.Platform['env']` in `src/app.d.ts`
- Upload new secrets with `echo "value" | npx wrangler secret put NAME`

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
- Tag badge: `bg-white/10 text-white/60 border border-white/10`
- No `transition-all`, no blue/indigo as primary color
- Every clickable element needs hover, focus-visible, and active states
- Empty states: icon + short message + CTA button (see /workouts and /progress for reference)
- PR badge: `bg-amber-500/15 text-amber-400 border border-amber-500/25`
- Admin badge: `bg-red-500/20 text-red-400 border border-red-500/30`
- All pages need `min-h-screen bg-neutral-950 text-white` on the outer wrapper div

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
      admin/
        users/
          [id]/
            +server.ts
    admin/
      +page.svelte
      +page.server.ts
      users/
        [id]/
          +page.svelte
          +page.server.ts
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
  0007_add_set_data.sql
  0008_add_workout_tag.sql
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
- VS Code TS errors after edits may be stale — run `Restart TS Server` from command palette to clear
