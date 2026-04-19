<script lang="ts">
  import { onMount } from 'svelte';
  import { fetchWorkouts } from '$lib/storage';
  import type { Workout } from '$lib/storage';

  let workouts = $state<Workout[]>([]);
  let loading = $state(true);

  onMount(async () => {
    try {
      workouts = await fetchWorkouts();
    } finally {
      loading = false;
    }
  });

  const workoutCount = $derived(workouts.length);

  // Intl.DateTimeFormat takes a number — no Date mutation inside $derived
  const localDateFmt = new Intl.DateTimeFormat('en-CA'); // gives YYYY-MM-DD
  const dateStr = (ms: number) => localDateFmt.format(ms);

  const streak = $derived(() => {
    if (workouts.length === 0) return 0;
    const dates = new Set(workouts.map(w => w.date));
    const now = Date.now();
    const todayStr = dateStr(now);
    const yesterdayStr = dateStr(now - 86400000);

    if (!dates.has(todayStr) && !dates.has(yesterdayStr)) return 0;

    let ms = dates.has(todayStr) ? now : now - 86400000;
    let count = 0;
    while (dates.has(dateStr(ms))) {
      count++;
      ms -= 86400000;
    }
    return count;
  });
</script>

<svelte:head>
  <title>Workout App</title>
</svelte:head>

<div class="min-h-screen bg-neutral-950 text-white">
  <div class="mx-auto flex min-h-screen max-w-4xl flex-col justify-center px-6 py-16">

    <div class="mb-6 inline-flex w-fit rounded-full border border-white/10 bg-white/5 px-3 py-1 text-sm text-white/70">
      V1 in progress
    </div>

    <h1 class="max-w-3xl text-4xl font-bold tracking-tight sm:text-6xl">
      Workout tracking with text import
    </h1>

    <p class="mt-6 max-w-2xl text-lg leading-8 text-white/70">
      Build workouts manually or paste workout notes and turn them into usable workout data.
    </p>

    {#if !loading}
      <div class="mt-4 flex items-center gap-4 text-sm text-white/40">
        {#if workoutCount > 0}
          <span>{workoutCount} workout{workoutCount > 1 ? 's' : ''} saved</span>
        {/if}
        {#if streak() >= 2}
          <span class="text-white/60">·</span>
          <span class="text-amber-400/80">{streak()} day streak</span>
        {/if}
      </div>
    {/if}

    <div class="mt-10 flex flex-wrap gap-4">
      <a href="/workouts/new" class="rounded-xl bg-white px-5 py-3 font-medium text-black hover:bg-white/90 active:bg-white/75 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50">
        + New workout
      </a>
      <a href="/workouts" class="rounded-xl border border-white/15 px-5 py-3 font-medium text-white hover:bg-white/5 active:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30">
        View workouts
      </a>
    </div>

  </div>
</div>
