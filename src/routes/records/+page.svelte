<!-- src/routes/records/+page.svelte -->
<script lang="ts">
  import { onMount } from 'svelte';
  import { fetchWorkouts } from '$lib/storage';
  import type { Workout } from '$lib/storage';

  type PR = { name: string; weight: number; unit: string; sets: number; reps: number; date: string; workoutId: string };

  let loading = $state(true);
  let records = $state<PR[]>([]);
  let query = $state('');

  const filtered = $derived(
    query.trim()
      ? records.filter(r => r.name.toLowerCase().includes(query.trim().toLowerCase()))
      : records
  );

  const fmt = (d: string) => new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(d + 'T00:00:00'));

  onMount(async () => {
    try {
      const workouts: Workout[] = await fetchWorkouts();
      const map = new Map<string, PR>();
      for (const w of workouts) {
        for (const e of w.exercises) {
          if (e.weight === null) continue;
          const existing = map.get(e.name);
          if (!existing || e.weight > existing.weight) {
            map.set(e.name, {
              name: e.name,
              weight: e.weight,
              unit: e.unit ?? 'kg',
              sets: e.sets,
              reps: e.reps,
              date: w.date,
              workoutId: w.id
            });
          }
        }
      }
      records = [...map.values()].sort((a, b) => a.name.localeCompare(b.name));
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

    {:else if records.length === 0}
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
      <input
        type="search"
        bind:value={query}
        placeholder="Filter exercises…"
        class="w-full rounded-md bg-white/5 border border-white/10 px-3 py-2 text-sm text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-white/20"
      />

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

      {#if filtered.length === 0}
        <p class="text-sm text-white/40 text-center">No records match "{query}".</p>
      {/if}
    {/if}

  </div>
</div>
