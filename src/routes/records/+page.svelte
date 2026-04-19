<!-- src/routes/records/+page.svelte -->
<script lang="ts">
  import { onMount } from 'svelte';
  import { fetchWorkouts } from '$lib/storage';
  import type { Workout } from '$lib/storage';

  type PR = { name: string; weight: number; unit: string; sets: number; reps: number; date: string; workoutId: string };

  let loading = $state(true);
  let allWorkouts = $state<Workout[]>([]);
  let query = $state('');
  let activeTag = $state<string | null>(null);

  const existingTags = $derived(
    [...new Set(allWorkouts.map(w => w.tag).filter((t): t is string => !!t))]
  );

  const records = $derived(() => {
    const workouts = activeTag ? allWorkouts.filter(w => w.tag === activeTag) : allWorkouts;
    const map = new Map<string, PR>();
    for (const w of workouts) {
      for (const e of w.exercises) {
        if (e.weight === null) continue;
        const existing = map.get(e.name);
        if (!existing || e.weight > existing.weight) {
          map.set(e.name, { name: e.name, weight: e.weight, unit: e.unit ?? 'kg', sets: e.sets, reps: e.reps, date: w.date, workoutId: w.id });
        }
      }
    }
    return [...map.values()].sort((a, b) => a.name.localeCompare(b.name));
  });

  const filtered = $derived(
    query.trim()
      ? records().filter(r => r.name.toLowerCase().includes(query.trim().toLowerCase()))
      : records()
  );

  const fmt = (d: string) => new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(d + 'T00:00:00'));

  onMount(async () => {
    try {
      allWorkouts = await fetchWorkouts();
    } finally {
      loading = false;
    }
  });
</script>

<svelte:head><title>Personal Records</title></svelte:head>

<div class="min-h-screen bg-neutral-950 text-white">
  <div class="max-w-2xl mx-auto px-6 py-10 space-y-6">

    <h1 class="text-2xl font-semibold tracking-tight">Personal Records</h1>

    {#if loading}
      <div class="space-y-2 animate-pulse">
        {#each [1,2,3,4,5] as i (i)}
          <div class="h-12 rounded-md bg-white/5 border border-white/10"></div>
        {/each}
      </div>

    {:else if allWorkouts.length === 0 || records().length === 0 && activeTag === null}
      <div class="rounded-md bg-white/5 border border-white/10 p-12 text-center space-y-3">
        <p class="text-sm font-medium text-white/60">No records yet</p>
        <p class="text-xs text-white/30">Log workouts with weights to see your PRs here</p>
        <div class="flex justify-center pt-1">
          <a href="/workouts/new" class="px-3 py-1.5 bg-white text-neutral-950 rounded-md text-sm font-medium hover:bg-white/90 active:bg-white/75">
            Add workout
          </a>
        </div>
      </div>

    {:else}
      {#if existingTags.length > 0}
        <div class="flex gap-2 flex-wrap">
          <button
            onclick={() => activeTag = null}
            class="px-3 py-1.5 rounded text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30
              {activeTag === null
                ? 'bg-white text-neutral-950'
                : 'bg-white/5 border border-white/10 text-white/50 hover:bg-white/10 hover:text-white active:bg-white/5'}"
          >All</button>
          {#each existingTags as t (t)}
            <button
              onclick={() => activeTag = activeTag === t ? null : t}
              class="px-3 py-1.5 rounded text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30
                {activeTag === t
                  ? 'bg-white text-neutral-950'
                  : 'bg-white/5 border border-white/10 text-white/50 hover:bg-white/10 hover:text-white active:bg-white/5'}"
            >{t}</button>
          {/each}
        </div>
      {/if}

      <input
        type="search"
        bind:value={query}
        placeholder="Filter exercises…"
        class="w-full rounded-md bg-white/5 border border-white/10 px-3 py-2 text-sm text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-white/20"
      />

      {#if filtered.length === 0}
        <p class="text-sm text-white/40 text-center">
          {query.trim() ? `No records match "${query}".` : 'No records for this tag.'}
        </p>
      {:else}
        <div class="rounded-md bg-white/5 border border-white/10 divide-y divide-white/5">
          {#each filtered as pr (pr.name)}
            <a
              href="/workouts/{pr.workoutId}"
              class="flex items-center justify-between px-4 py-3 hover:bg-white/5 active:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/20"
            >
              <div>
                <p class="text-sm font-medium text-white">{pr.name}</p>
                <p class="text-xs text-white/30 mt-0.5">{fmt(pr.date)}</p>
              </div>
              <div class="text-right">
                <p class="text-sm font-semibold text-white">{pr.weight}{pr.unit}</p>
                <p class="text-xs text-white/40">{pr.sets}×{pr.reps}</p>
              </div>
            </a>
          {/each}
        </div>
      {/if}
    {/if}

  </div>
</div>
