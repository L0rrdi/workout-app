<!-- src/routes/import/+page.svelte -->
<script lang="ts">
  import { parseText } from '$lib/parser';
  import type { ParsedExercise, ParseError } from '$lib/parser';
  import { createWorkout, generateId } from '$lib/storage';

  let rawInput = $state('');
  let workoutTitle = $state('');
  let exercises = $state<ParsedExercise[]>([]);
  let errors = $state<ParseError[]>([]);
  let hasParsed = $state(false);
  let savedMessage = $state('');

  function handleParse() {
    const result = parseText(rawInput);
    exercises = result.exercises.map((e) => ({ ...e }));
    errors = result.errors;
    hasParsed = true;
    savedMessage = '';
  }

  async function handleSave() {
    if (exercises.length === 0) return;
    await createWorkout({
      id: generateId(),
      title: workoutTitle.trim() || 'Untitled Workout',
      date: new Date().toISOString().split('T')[0],
      exercises
    });
    savedMessage = 'Workout saved!';
    rawInput = '';
    workoutTitle = '';
    exercises = [];
    errors = [];
    hasParsed = false;
  }
</script>

<div class="max-w-2xl mx-auto p-6 space-y-6">

  <h1 class="text-2xl font-bold">Import Workout</h1>

  <div class="space-y-2">
    <label for="workout-title" class="block text-sm font-medium text-gray-700">
      Workout title <span class="text-gray-400">(optional)</span>
    </label>
    <input
      id="workout-title"
      type="text"
      bind:value={workoutTitle}
      placeholder="e.g. Push Day"
      class="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
    />
  </div>

  <div class="space-y-2">
    <label for="workout-input" class="block text-sm font-medium text-gray-700">
      Paste your workout text
    </label>
    <textarea
      id="workout-input"
      bind:value={rawInput}
      rows={8}
      placeholder="Bench Press 3x8 60kg
Squat 5 x 5 100 kg
Pull ups 3x10
Curl 12kg 3x12"
      class="w-full rounded-md border border-gray-300 p-3 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
    ></textarea>
  </div>

  <button
    onclick={handleParse}
    disabled={rawInput.trim().length === 0}
    class="px-4 py-2 bg-blue-600 text-white rounded-md font-medium hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed"
  >
    Parse
  </button>

  {#if savedMessage}
    <div class="rounded-md bg-green-50 border border-green-200 p-3 text-sm text-green-700">
      {savedMessage} — <a href="/workouts" class="underline">View workouts</a>
    </div>
  {/if}

  {#if hasParsed}

    {#if errors.length > 0}
      <div class="rounded-md bg-red-50 border border-red-200 p-4 space-y-1">
        <p class="text-sm font-semibold text-red-700">
          Could not parse {errors.length} line{errors.length > 1 ? 's' : ''}:
        </p>
        {#each errors as err (err.line)}
          <p class="text-sm text-red-600 font-mono">"{err.line}" — {err.reason}</p>
        {/each}
      </div>
    {/if}

    {#if exercises.length > 0}
      <div class="space-y-3">
        <h2 class="text-lg font-semibold">
          Parsed {exercises.length} exercise{exercises.length > 1 ? 's' : ''}
        </h2>

        {#each exercises as exercise (exercise.raw)}
          <div class="rounded-md border border-gray-200 p-4 space-y-3 bg-white shadow-sm">

            <div class="space-y-1">
              <label for="name-{exercise.raw}" class="block text-xs font-medium text-gray-500 uppercase tracking-wide">
                Exercise name
              </label>
              <input
                id="name-{exercise.raw}"
                type="text"
                bind:value={exercise.name}
                class="w-full rounded border border-gray-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div class="grid grid-cols-3 gap-3">
              <div class="space-y-1">
                <label for="sets-{exercise.raw}" class="block text-xs font-medium text-gray-500 uppercase tracking-wide">Sets</label>
                <input id="sets-{exercise.raw}" type="number" bind:value={exercise.sets} min="1" class="w-full rounded border border-gray-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div class="space-y-1">
                <label for="reps-{exercise.raw}" class="block text-xs font-medium text-gray-500 uppercase tracking-wide">Reps</label>
                <input id="reps-{exercise.raw}" type="number" bind:value={exercise.reps} min="1" class="w-full rounded border border-gray-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div class="space-y-1">
                <label for="weight-{exercise.raw}" class="block text-xs font-medium text-gray-500 uppercase tracking-wide">
                  Weight ({exercise.unit ?? 'bodyweight'})
                </label>
                <input id="weight-{exercise.raw}" type="number" bind:value={exercise.weight} min="0" step="0.5" placeholder="—" disabled={exercise.weight === null} class="w-full rounded border border-gray-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50 disabled:text-gray-400" />
              </div>
            </div>

          </div>
        {/each}

        <button
          onclick={handleSave}
          class="w-full px-4 py-2 bg-green-600 text-white rounded-md font-medium hover:bg-green-700"
        >
          Save workout
        </button>

      </div>
    {/if}

    {#if exercises.length === 0 && errors.length === 0}
      <p class="text-sm text-gray-500">Nothing to show — try pasting some exercises.</p>
    {/if}

  {/if}

</div>
