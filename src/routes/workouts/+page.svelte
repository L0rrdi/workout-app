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
</script>

<div class="max-w-2xl mx-auto p-6 space-y-6">

  <div class="flex items-center justify-between">
    <h1 class="text-2xl font-bold">Workouts</h1>
    <a href="/import" class="px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700">
      + Import workout
    </a>
  </div>

  {#if loading}
    <p class="text-sm text-gray-500">Loading...</p>

  {:else if error}
    <p class="text-sm text-red-500">{error}</p>

  {:else if workouts.length === 0}
    <div class="rounded-md border border-gray-200 p-8 text-center text-gray-500">
      <p class="text-sm">No workouts yet.</p>
      <p class="mt-2 text-sm">
        <a href="/import" class="text-blue-600 hover:underline">Import your first workout</a>
      </p>
    </div>

  {:else}
    <div class="space-y-4">
      {#each workouts as workout (workout.id)}
        <div class="rounded-md border border-gray-200 bg-white shadow-sm">

          <div class="flex items-center justify-between px-4 py-3 border-b border-gray-100">
            <div>
              <a href="/workouts/{workout.id}" class="font-semibold hover:text-blue-600 transition">
                {workout.title}
              </a>
              <p class="text-xs text-gray-400">{workout.date}</p>
            </div>
            <button onclick={() => handleDelete(workout.id)} class="text-xs text-red-400 hover:text-red-600">
              Delete
            </button>
          </div>

          <ul class="divide-y divide-gray-100">
            {#each workout.exercises as exercise (exercise.raw)}
              <li class="flex items-center justify-between px-4 py-2 text-sm">
                <span class="font-medium">{exercise.name}</span>
                <span class="text-gray-500">
                  {exercise.sets}x{exercise.reps}
                  {#if exercise.weight !== null}
                    � {exercise.weight}{exercise.unit}
                  {:else}
                    � bodyweight
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
