<!-- src/routes/workouts/+page.svelte -->
<script lang="ts">
  import { fetchWorkouts, removeWorkout } from '$lib/storage';
  import type { Workout } from '$lib/storage';
  import { SvelteMap } from 'svelte/reactivity';

  type DayFilter = 'all' | 'push' | 'pull' | 'legs' | 'other';

  let workouts = $state<Workout[]>([]);
  let loading = $state(true);
  let error = $state('');
  let query = $state('');
  let dayFilter = $state<DayFilter>('all');
  let confirmDeleteId = $state<string | null>(null);

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
    confirmDeleteId = null;
    await loadWorkouts();
  }

  loadWorkouts();

  const fmtWeek = (d: string) => new Date(d + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

  function relativeDate(dateStr: string): string {
    const todayMs = Date.now() - (Date.now() % 86400000) - new Date().getTimezoneOffset() * 60000;
    const dMs = new Date(dateStr + 'T00:00:00').getTime();
    const diffDays = Math.round((todayMs - dMs) / 86400000);
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays <= 6) return `${diffDays} days ago`;
    return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(dateStr + 'T00:00:00'));
  }

  function classifyWorkout(title: string): DayFilter {
    const t = title.toLowerCase();
    if (t.includes('push')) return 'push';
    if (t.includes('pull')) return 'pull';
    if (t.includes('leg')) return 'legs';
    return 'other';
  }

  const dayFilters: { label: string; value: DayFilter }[] = [
    { label: 'All', value: 'all' },
    { label: 'Push', value: 'push' },
    { label: 'Pull', value: 'pull' },
    { label: 'Legs', value: 'legs' },
    { label: 'Other', value: 'other' },
  ];

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
    return workouts.filter(w => {
      if (dayFilter !== 'all' && classifyWorkout(w.title) !== dayFilter) return false;
      if (!q) return true;
      return w.title.toLowerCase().includes(q) || w.exercises.some(e => e.name.toLowerCase().includes(q));
    });
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
      <div class="flex gap-2">
        <a
          href="/templates"
          class="px-3 py-1.5 bg-white/5 border border-white/10 text-white/70 rounded-md text-sm font-medium hover:bg-white/10 hover:text-white active:bg-white/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30"
        >
          Templates
        </a>
        <a
          href="/import"
          class="px-3 py-1.5 bg-white/5 border border-white/10 text-white/70 rounded-md text-sm font-medium hover:bg-white/10 hover:text-white active:bg-white/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30"
        >
          Import
        </a>
        <a
          href="/workouts/new"
          class="px-3 py-1.5 bg-white text-neutral-950 rounded-md text-sm font-medium hover:bg-white/90 active:bg-white/75 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50"
        >
          + New
        </a>
      </div>
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

      <!-- Day filter -->
      <div class="flex gap-1.5 flex-wrap">
        {#each dayFilters as f (f.value)}
          <button
            onclick={() => dayFilter = f.value}
            class="px-3 py-1.5 rounded text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30
              {dayFilter === f.value ? 'bg-white text-neutral-950' : 'bg-white/5 text-white/50 hover:bg-white/10 hover:text-white active:bg-white/5'}"
          >{f.label}</button>
        {/each}
      </div>

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
                <div class="flex items-center gap-2">
                  <a
                    href="/workouts/{workout.id}"
                    class="font-semibold text-white hover:text-white/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30 rounded"
                  >
                    {workout.title}
                  </a>
                  {#if workout.tag}
                    <span class="px-1.5 py-0.5 rounded text-xs font-medium bg-white/10 text-white/50 border border-white/10">{workout.tag}</span>
                  {/if}
                </div>
                <div class="flex items-center gap-2 mt-0.5">
                  <p class="text-xs text-white/30">{relativeDate(workout.date)}</p>
                  {#if vol > 0}
                    <span class="text-white/20">·</span>
                    <p class="text-xs text-white/25">{vol.toLocaleString()} kg</p>
                  {/if}
                </div>
              </div>
              {#if confirmDeleteId === workout.id}
                <div class="flex items-center gap-2">
                  <span class="text-xs text-white/40">Sure?</span>
                  <button
                    onclick={() => handleDelete(workout.id)}
                    class="text-xs text-red-400 hover:text-red-300 active:text-red-500 focus-visible:outline-none rounded px-1"
                  >Yes</button>
                  <button
                    onclick={() => confirmDeleteId = null}
                    class="text-xs text-white/30 hover:text-white active:text-white/60 focus-visible:outline-none rounded px-1"
                  >No</button>
                </div>
              {:else}
                <button
                  onclick={() => confirmDeleteId = workout.id}
                  class="text-xs text-white/30 hover:text-red-400 active:text-red-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400/40 rounded px-1"
                >
                  Delete
                </button>
              {/if}
            </div>

            <ul class="divide-y divide-white/5">
              {#each workout.exercises as exercise, i (i)}
                {@const cardio = (() => { try { const p = JSON.parse(exercise.set_data ?? ''); return p.cardio ? p : null; } catch { return null; } })()}
                <li class="flex items-center justify-between px-4 py-2 text-sm">
                  <span class="font-medium text-white">{exercise.name}</span>
                  <span class="text-white/40">
                    {#if cardio}
                      {@const pSec = cardio.timeSeconds / cardio.distanceKm}
                      {cardio.distanceKm} km · {Math.floor(cardio.timeSeconds / 60)}:{String(cardio.timeSeconds % 60).padStart(2, '0')} · {Math.floor(pSec / 60)}:{String(Math.round(pSec % 60)).padStart(2, '0')}/km
                    {:else if exercise.weight !== null}
                      {exercise.sets}x{exercise.reps} · {exercise.weight}{exercise.unit}
                    {:else}
                      {exercise.sets}x{exercise.reps} · bodyweight
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
