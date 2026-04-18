<!-- src/routes/workouts/[id]/+page.svelte -->
<script lang="ts">
  import { fetchWorkouts, updateWorkout } from '$lib/storage';
  import type { Workout } from '$lib/storage';
  import type { ParsedExercise } from '$lib/parser';
  import { page } from '$app/state';

  const id = page.params.id;

  const fmt = (d: string) => new Date(d + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

  let workout = $state<Workout | null>(null);
  let loading = $state(true);
  let error = $state('');
  let editing = $state(false);
  let saving = $state(false);

  type EditExercise = ParsedExercise & { _key: number };

  // editable copies
  let editTitle = $state('');
  let editDate = $state('');
  let editExercises = $state<EditExercise[]>([]);
  let nextKey = 0;

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

  function startEdit() {
    if (!workout) return;
    nextKey = workout.exercises.length;
    editTitle = workout.title;
    editDate = workout.date;
    editExercises = workout.exercises.map((e, i) => ({ ...e, _key: i }));
    editing = true;
  }

  function cancelEdit() {
    editing = false;
  }

  function removeExercise(key: number) {
    editExercises = editExercises.filter(e => e._key !== key);
  }

  function addExercise() {
    editExercises = [...editExercises, {
      name: '',
      sets: 3,
      reps: 8,
      weight: null,
      unit: 'kg',
      raw: '',
      _key: nextKey++
    }];
  }

  async function saveEdit() {
    if (!workout) return;
    saving = true;
    try {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const exercises = editExercises.map(({ _key, ...e }) => e);
      await updateWorkout({ ...workout, title: editTitle.trim() || 'Untitled Workout', date: editDate, exercises });
      await load();
      editing = false;
    } catch {
      error = 'Could not save changes.';
    } finally {
      saving = false;
    }
  }

  load();
</script>

<svelte:head>
  <title>{workout ? workout.title : 'Workout'}</title>
</svelte:head>

<div class="min-h-screen bg-neutral-950 text-white">
  <div class="max-w-2xl mx-auto px-6 py-10 space-y-6">

    <a
      href="/workouts"
      class="inline-flex items-center gap-1 text-sm text-white/40 hover:text-white active:text-white/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30 rounded"
    >
      ← Back
    </a>

    {#if loading}
      <div class="space-y-4 animate-pulse">
        <div class="space-y-2">
          <div class="h-7 w-48 rounded bg-white/10"></div>
          <div class="h-3 w-24 rounded bg-white/5"></div>
        </div>
        <div class="rounded-md bg-white/5 border border-white/10">
          <div class="px-4 py-3 border-b border-white/10">
            <div class="h-3 w-24 rounded bg-white/10"></div>
          </div>
          <div class="divide-y divide-white/5">
            {#each [1, 2, 3, 4] as i (i)}
              <div class="px-4 py-3 space-y-2">
                <div class="h-4 w-32 rounded bg-white/10"></div>
                <div class="h-3 w-24 rounded bg-white/5"></div>
              </div>
            {/each}
          </div>
        </div>
      </div>

    {:else if error}
      <p class="text-sm text-red-400">{error}</p>

    {:else if !workout}
      <div class="rounded-md bg-white/5 border border-white/10 p-8 text-center">
        <p class="text-sm text-white/50">Workout not found.</p>
        <p class="mt-2 text-sm">
          <a href="/workouts" class="text-white underline hover:text-white/70">Go back to workouts</a>
        </p>
      </div>

    {:else if editing}
      <!-- ── Edit mode ── -->
      <div class="space-y-5">

        <div class="space-y-1.5">
          <label for="edit-title" class="block text-xs font-medium text-white/40 uppercase tracking-wide">Title</label>
          <input
            id="edit-title"
            type="text"
            bind:value={editTitle}
            class="w-full rounded-md bg-white/5 border border-white/10 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-white/20"
          />
        </div>

        <div class="space-y-1.5">
          <label for="edit-date" class="block text-xs font-medium text-white/40 uppercase tracking-wide">Date</label>
          <input
            id="edit-date"
            type="date"
            bind:value={editDate}
            class="w-full rounded-md bg-white/5 border border-white/10 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-white/20 scheme-dark"
          />
        </div>

        <div class="space-y-3">
          <p class="text-xs font-medium text-white/40 uppercase tracking-wide">Exercises</p>
          {#each editExercises as exercise (exercise._key)}
            <div class="rounded-md bg-white/5 border border-white/10 p-4 space-y-3">

              <div class="flex items-start justify-between gap-3">
                <div class="flex-1 space-y-1">
                  <label for="edit-name-{exercise._key}" class="block text-xs font-medium text-white/40 uppercase tracking-wide">Name</label>
                  <input
                    id="edit-name-{exercise._key}"
                    type="text"
                    bind:value={exercise.name}
                    class="w-full rounded bg-white/5 border border-white/10 px-3 py-1.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-white/20"
                  />
                </div>
                <button
                  onclick={() => removeExercise(exercise._key)}
                  class="mt-5 text-white/20 hover:text-red-400 active:text-red-500 focus-visible:outline-none text-lg leading-none"
                  aria-label="Remove exercise"
                >×</button>
              </div>

              <div class="grid grid-cols-3 gap-3">
                <div class="space-y-1">
                  <label for="edit-sets-{exercise._key}" class="block text-xs font-medium text-white/40 uppercase tracking-wide">Sets</label>
                  <input id="edit-sets-{exercise._key}" type="number" bind:value={exercise.sets} min="1" class="w-full rounded bg-white/5 border border-white/10 px-3 py-1.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-white/20" />
                </div>
                <div class="space-y-1">
                  <label for="edit-reps-{exercise._key}" class="block text-xs font-medium text-white/40 uppercase tracking-wide">Reps</label>
                  <input id="edit-reps-{exercise._key}" type="number" bind:value={exercise.reps} min="1" class="w-full rounded bg-white/5 border border-white/10 px-3 py-1.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-white/20" />
                </div>
                <div class="space-y-1">
                  <label for="edit-weight-{exercise._key}" class="block text-xs font-medium text-white/40 uppercase tracking-wide">
                    Weight ({exercise.unit ?? 'bodyweight'})
                  </label>
                  <input
                    id="edit-weight-{exercise._key}"
                    type="number"
                    bind:value={exercise.weight}
                    min="0"
                    step="0.5"
                    placeholder="—"
                    disabled={exercise.weight === null}
                    class="w-full rounded bg-white/5 border border-white/10 px-3 py-1.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-white/20 disabled:opacity-30 disabled:cursor-not-allowed"
                  />
                </div>
              </div>

            </div>
          {/each}

          <button
            onclick={addExercise}
            class="w-full px-4 py-2.5 rounded-md bg-white/5 border border-white/10 border-dashed text-sm text-white/40 hover:bg-white/10 hover:text-white active:bg-white/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/20"
          >
            + Add exercise
          </button>
        </div>

        <div class="flex gap-3">
          <button
            onclick={saveEdit}
            disabled={saving}
            class="px-4 py-2 bg-white text-neutral-950 rounded-md text-sm font-medium hover:bg-white/90 active:bg-white/75 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {saving ? 'Saving…' : 'Save changes'}
          </button>
          <button
            onclick={cancelEdit}
            class="px-4 py-2 bg-white/5 border border-white/10 text-white/70 rounded-md text-sm font-medium hover:bg-white/10 hover:text-white active:bg-white/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30"
          >
            Cancel
          </button>
        </div>

      </div>

    {:else}
      <!-- ── View mode ── -->
      <div class="flex items-start justify-between">
        <div class="space-y-1">
          <h1 class="text-2xl font-semibold tracking-tight">{workout.title}</h1>
          <p class="text-sm text-white/30">{fmt(workout.date)}</p>
        </div>
        <button
          onclick={startEdit}
          class="px-3 py-1.5 bg-white/5 border border-white/10 text-white/60 rounded-md text-sm hover:bg-white/10 hover:text-white active:bg-white/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30"
        >
          Edit
        </button>
      </div>

      <div class="rounded-md bg-white/5 border border-white/10">
        <div class="px-4 py-3 border-b border-white/10">
          <p class="text-xs font-medium text-white/40 uppercase tracking-wide">
            {workout.exercises.length} exercise{workout.exercises.length > 1 ? 's' : ''}
          </p>
        </div>
        <ul class="divide-y divide-white/5">
          {#each workout.exercises as exercise (exercise.raw)}
            <li class="px-4 py-3 space-y-0.5">
              <p class="font-medium text-white">{exercise.name}</p>
              <p class="text-sm text-white/40">
                {exercise.sets} sets × {exercise.reps} reps
                {#if exercise.weight !== null}
                  · {exercise.weight}{exercise.unit}
                {:else}
                  · bodyweight
                {/if}
              </p>
            </li>
          {/each}
        </ul>
      </div>
    {/if}

  </div>
</div>
