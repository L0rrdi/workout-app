<!-- src/routes/workouts/+page.svelte -->
<script lang="ts">
  import { fetchWorkouts, removeWorkout } from '$lib/storage';
  import type { Workout } from '$lib/storage';
  import { SvelteMap } from 'svelte/reactivity';

  let workouts = $state<Workout[]>([]);
  let loading = $state(true);
  let error = $state('');
  let query = $state('');

  async function loadWorkouts() {
    try {
      workouts = await fetchWorkouts();
    } catch {
      error = 'Could not load workouts.';
    } finally {
      loading = false;
    }
  }

  async function handleDelete(id: string) {
    await removeWorkout(id);
    await loadWorkouts();
  }

  loadWorkouts();

  const fmt = (d: string) => new Date(d + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  const fmtWeek = (d: string) => new Date(d + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

  function workoutVolume(w: Workout): number {
    return w.exercises.reduce((sum, e) =>
      e.weight !== null ? sum + e.sets * e.reps * e.weight : sum, 0
    );
  }

  function addDays(dateStr: string, days: number): string {
    const ms = new Date(dateStr + 'T00:00:00').getTime() + days * 86400000;
    return new Date(ms).toISOString().split('T')[0];
  }

  function weekStart(dateStr: string): string {
    const d = new Date(dateStr + 'T00:00:00');
    const day = d.getDay();
    const diff = day === 0 ? 6 : day - 1;
    return new Date(d.getTime() - diff * 86400000).toISOString().split('T')[0];
  }

  const filtered = $derived(() => {
    const q = query.trim().toLowerCase();
    if (!q) return workouts;
    return workouts.filter(w =>
      w.title.toLowerCase().includes(q) ||
      w.exercises.some(e => e.name.toLowerCase().includes(q))
    );
  });

  const weeklyVolume = $derived(() => {
    const map = new SvelteMap<string, number>();
    for (const w of workouts) {
      const week = weekStart(w.date);
      map.set(week, (map.get(week) ?? 0) + workoutVolume(w));
    }
    return [...map.entries()]
      .sort((a, b) => b[0].localeCompare(a[0]))
      .slice(0, 4)
      .map(([week, volume]) => ({ week, weekEnd: addDays(week, 6), volume }));
  });
</script>

<div class="min-h-screen bg-neutral-950 text-white">
  <div class="max-w-2xl mx-auto px-6 py-10 space-y-6">

    <div class="flex items-center justify-between">
      <h1 class="text-2xl font-semibold tracking-tight">Workouts</h1>
      <a
        href="/import"
        class="px-3 py-1.5 bg-white text-neutral-950 rounded-md text-sm font-medium hover:bg-white/90 active:bg-white/75 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50"
      >
        + Import
      </a>
    </div>

    {#if loading}
      <div class="space-y-4 animate-pulse">
        {#each [1, 2, 3] as i (i)}
          <div class="rounded-md bg-white/5 border border-white/10">
            <div class="flex items-center justify-between px-4 py-3 border-b border-white/10">
              <div class="space-y-2">
                <div class="h-4 w-36 rounded bg-white/10"></div>
                <div class="h-3 w-20 rounded bg-white/5"></div>
              </div>
            </div>
            <div class="px-4 py-3 space-y-2">
              <div class="h-3 w-full rounded bg-white/5"></div>
              <div class="h-3 w-4/5 rounded bg-white/5"></div>
            </div>
          </div>
        {/each}
      </div>

    {:else if error}
      <p class="text-sm text-red-400">{error}</p>

    {:else if workouts.length === 0}
      <div class="rounded-md bg-white/5 border border-white/10 p-12 text-center space-y-3">
        <p class="text-2xl">🏋️</p>
        <p class="text-sm font-medium text-white/60">No workouts yet</p>
        <p class="text-xs text-white/30">Import your notes or log your first session</p>
        <div class="flex justify-center gap-2 pt-1">
          <a href="/import"
            class="px-3 py-1.5 bg-white text-neutral-950 rounded-md text-sm font-medium hover:bg-white/90 active:bg-white/75">
            Import workout
          </a>
        </div>
      </div>

    {:else}

      <!-- Weekly volume summary -->
      {#if weeklyVolume().some(w => w.volume > 0)}
        <div class="space-y-1.5">
          <p class="text-xs font-medium text-white/40 uppercase tracking-wide">Volume per week</p>
          <div class="rounded-md bg-white/5 border border-white/10 divide-y divide-white/5">
            {#each weeklyVolume() as w (w.week)}
              <div class="flex items-center justify-between px-4 py-2.5 text-sm">
                <span class="text-white/50">{fmtWeek(w.week)} – {fmtWeek(w.weekEnd)}</span>
                <span class="text-white font-medium tabular-nums">{w.volume.toLocaleString()} kg</span>
              </div>
            {/each}
          </div>
        </div>
      {/if}

      <!-- Search -->
      <input
        type="search"
        bind:value={query}
        placeholder="Search by workout or exercise…"
        class="w-full rounded-md bg-white/5 border border-white/10 px-3 py-2 text-sm text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-white/20"
      />

      <!-- Workout list -->
      {#if filtered().length === 0}
        <div class="rounded-md bg-white/5 border border-white/10 p-8 text-center">
          <p class="text-sm text-white/40">No workouts match "{query}".</p>
        </div>
      {:else}
      <div class="space-y-4">
        {#each filtered() as workout (workout.id)}
          {@const vol = workoutVolume(workout)}
          <div class="rounded-md bg-white/5 border border-white/10">

            <div class="flex items-center justify-between px-4 py-3 border-b border-white/10">
              <div>
                <a
                  href="/workouts/{workout.id}"
                  class="font-semibold text-white hover:text-white/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30 rounded"
                >
                  {workout.title}
                </a>
                <div class="flex items-center gap-2 mt-0.5">
                  <p class="text-xs text-white/30">{fmt(workout.date)}</p>
                  {#if vol > 0}
                    <span class="text-white/20">·</span>
                    <p class="text-xs text-white/25">{vol.toLocaleString()} kg</p>
                  {/if}
                </div>
              </div>
              <button
                onclick={() => handleDelete(workout.id)}
                class="text-xs text-white/30 hover:text-red-400 active:text-red-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400/40 rounded px-1"
              >
                Delete
              </button>
            </div>

            <ul class="divide-y divide-white/5">
              {#each workout.exercises as exercise, i (i)}
                <li class="flex items-center justify-between px-4 py-2 text-sm">
                  <span class="font-medium text-white">{exercise.name}</span>
                  <span class="text-white/40">
                    {exercise.sets}x{exercise.reps}
                    {#if exercise.weight !== null}
                      · {exercise.weight}{exercise.unit}
                    {:else}
                      · bodyweight
                    {/if}
                  </span>
                </li>
              {/each}
            </ul>

          </div>
        {/each}
      </div>
      {/if}
    {/if}

  </div>
</div>
