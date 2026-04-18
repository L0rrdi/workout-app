<!-- src/routes/workouts/[id]/+page.svelte -->
<script lang="ts">
  import { fetchWorkouts } from '$lib/storage';
  import type { Workout } from '$lib/storage';
  import { page } from '$app/stores';

  const id = $page.params.id;

  let workout = $state<Workout | null>(null);
  let loading = $state(true);
  let error = $state('');

  async function load() {
    try {
      const workouts = await fetchWorkouts();
      workout = workouts.find((w) => w.id === id) ?? null;
    } catch {
      error = 'Could not load workout.';
    } finally {
      loading = false;
    }
  }

  load();
</script>

<svelte:head>
  <title>{workout ? workout.title : 'Workout'}</title>
</svelte:head>

<div class="max-w-2xl mx-auto p-6 space-y-6">

  <a href="/workouts" class="text-sm text-blue-600 hover:underline">
    &larr; Back to workouts
  </a>

  {#if loading}
    <p class="text-sm text-gray-500">Loading...</p>

  {:else if error}
    <p class="text-sm text-red-500">{error}</p>

  {:else if !workout}
    <div class="rounded-md border border-gray-200 p-8 text-center text-gray-500">
      <p class="text-sm">Workout not found.</p>
      <p class="mt-2 text-sm">
        <a href="/workouts" class="text-blue-600 hover:underline">Go back to workouts</a>
      </p>
    </div>

  {:else}
    <div class="space-y-1">
      <h1 class="text-2xl font-bold">{workout.title}</h1>
      <p class="text-sm text-gray-400">{workout.date}</p>
    </div>

    <div class="rounded-md border border-gray-200 bg-white shadow-sm">
      <div class="px-4 py-3 border-b border-gray-100">
        <p class="text-sm font-medium text-gray-500">
          {workout.exercises.length} exercise{workout.exercises.length > 1 ? 's' : ''}
        </p>
      </div>
      <ul class="divide-y divide-gray-100">
        {#each workout.exercises as exercise (exercise.raw)}
          <li class="px-4 py-3 space-y-1">
            <p class="font-medium">{exercise.name}</p>
            <p class="text-sm text-gray-500">
              {exercise.sets} sets &times; {exercise.reps} reps
              {#if exercise.weight !== null}
                &middot; {exercise.weight}{exercise.unit}
              {:else}
                &middot; bodyweight
              {/if}
            </p>
          </li>
        {/each}
      </ul>
    </div>
  {/if}

</div>