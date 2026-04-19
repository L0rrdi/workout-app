# Frontend Design Rules

## Stack
- SvelteKit + Tailwind CSS (already installed, no CDN needed)
- All styles via Tailwind utility classes in .svelte files
- No new libraries without asking the user first

## Design Direction (Workout App)
- Dark background: `bg-neutral-950`
- Primary text: `text-white`
- Secondary text: `text-white/70`
- Cards/panels: `bg-white/5 border border-white/10`
- Inputs: dark styled with `bg-white/5 border-white/10 text-white`
- Buttons: white or accent on dark background
- Keep it clean and minimal

## Anti-Generic Guardrails
- **Colors:** Do not use default Tailwind blue/indigo as the primary color
- **Shadows:** Avoid flat `shadow-md` — use subtle, layered shadows with low opacity
- **Typography:** Apply tight tracking (`tracking-tight`) on large headings
- **Interactive states:** Every clickable element needs hover, focus-visible, and active states
- **Spacing:** Use consistent spacing — not random Tailwind steps
- **Depth:** Surfaces should feel layered (base → elevated → floating)

## Hard Rules
- Do not add features or sections not asked for
- Do not use `transition-all`
- Do not use default Tailwind blue/indigo as primary color
- Do not introduce new libraries
- Keep all Svelte 5 syntax rules (see handoff file)
- One file at a time, step by step
