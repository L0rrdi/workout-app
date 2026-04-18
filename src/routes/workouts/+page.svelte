<!-- src/routes/workouts/+page.svelte -->
<script lang="ts">
  import { fetchWorkouts, removeWorkout } from '$lib/storage';
  import type { Workout } from '$lib/storage';

  let workouts = $state<Workout[]>([]);
  let loading = $state(true);
  let error = $state('');

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
      <div class="rounded-md bg-white/5 border border-white/10 p-8 text-center">
        <p class="text-sm text-white/50">No workouts yet.</p>
        <p class="mt-2 text-sm">
          <a href="/import" class="text-white underline hover:text-white/70">Import your first workout</a>
        </p>
      </div>

    {:else}
      <div class="space-y-4">
        {#each workouts as workout (workout.id)}
          <div class="rounded-md bg-white/5 border border-white/10">

            <div class="flex items-center justify-between px-4 py-3 border-b border-white/10">
              <div>
                <a
                  href="/workouts/{workout.id}"
                  class="font-semibold text-white hover:text-white/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30 rounded"
                >
                  {workout.title}
                </a>
                <p class="text-xs text-white/30 mt-0.5">{fmt(workout.date)}</p>
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

  </div>
</div>
