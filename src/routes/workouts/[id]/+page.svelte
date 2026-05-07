<!-- src/routes/workouts/[id]/+page.svelte -->
<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { fetchWorkouts, updateWorkout } from '$lib/storage';
  import type { Workout, SetRow } from '$lib/storage';
  import type { WeightUnit } from '$lib/parser';
  import { page } from '$app/state';
  import { beforeNavigate, goto } from '$app/navigation';
  import { SvelteMap, SvelteSet } from 'svelte/reactivity';

  const id = page.params.id;
  const fmt = (d: string) => new Date(d + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

  let allWorkouts = $state<Workout[]>([]);
  let workout = $state<Workout | null>(null);
  let loading = $state(true);
  let error = $state('');
  let editing = $state(false);
  let saving = $state(false);

  // Unsaved-changes guard
  let editSnapshot = '';
  let allowNavigation = false;
  let pendingNav = $state<string | null>(null);
  let showUnsavedModal = $state(false);

  function snapshotEdit() {
    return JSON.stringify({ editTitle, editDate, editNotes, editTag, editExercises });
  }

  const TAGS = ['Strength', 'Hypertrophy'];

  type EditExercise = { _key: number; name: string; unit: string; setRows: SetRow[] };
  let editTitle = $state('');
  let editDate = $state('');
  let editNotes = $state('');
  let editTag = $state<string | null>(null);
  let editExercises = $state<EditExercise[]>([]);
  let nextKey = 0;

  // Unique exercise names for the autocomplete datalist (skips cardio).
  const exerciseNameSuggestions = $derived(() => {
    const names = new SvelteSet<string>();
    for (const w of allWorkouts) {
      for (const e of w.exercises) {
        if (e.set_data) {
          try {
            const parsed = JSON.parse(e.set_data);
            if (parsed && parsed.cardio) continue;
          } catch { /* ignore */ }
        }
        const trimmed = e.name.trim();
        if (trimmed) names.add(trimmed);
      }
    }
    return [...names].sort((a, b) => a.localeCompare(b));
  });

  const prMap = $derived(() => {
    const map = new SvelteMap<string, number>();
    for (const w of allWorkouts) {
      for (const e of w.exercises) {
        if (e.weight !== null) {
          const best = map.get(e.name) ?? 0;
          if (e.weight > best) map.set(e.name, e.weight);
        }
      }
    }
    return map;
  });

  const totalVolume = $derived(() => {
    if (!workout) return 0;
    return workout.exercises.reduce((sum, e) => {
      if (e.set_data) {
        const parsed = JSON.parse(e.set_data);
        if (parsed.cardio) return sum;
        const rows: SetRow[] = parsed;
        return sum + rows.reduce((s, r) => r.weight !== null && r.reps !== null ? s + r.reps * r.weight : s, 0);
      }
      return e.weight !== null ? sum + e.sets * e.reps * e.weight : sum;
    }, 0);
  });

  async function load() {
    try {
      allWorkouts = await fetchWorkouts();
      workout = allWorkouts.find((w) => w.id === id) ?? null;
      if (!workout) {
        const res = await fetch(`/api/workouts/${id}`);
        if (res.ok) workout = await res.json();
      }
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
    editNotes = workout.notes ?? '';
    editTag = workout.tag ?? null;
    editExercises = workout.exercises.map((e, i) => ({
      _key: i,
      name: e.name,
      unit: e.unit ?? 'kg',
      setRows: e.set_data
        ? JSON.parse(e.set_data) as SetRow[]
        : Array.from({ length: e.sets }, () => ({ reps: e.reps, weight: e.weight }))
    }));
    editing = true;
    editSnapshot = snapshotEdit();
  }

  function cancelEdit() { editing = false; }

  beforeNavigate(({ cancel, to }) => {
    if (allowNavigation) return;
    if (!editing) return;
    if (snapshotEdit() === editSnapshot) return; // no changes
    if (!to) return;
    cancel();
    pendingNav = to.url.pathname + to.url.search;
    showUnsavedModal = true;
  });

  async function saveAndLeave() {
    await saveEdit();
    if (error) { showUnsavedModal = false; return; }
    allowNavigation = true;
    if (pendingNav) goto(pendingNav);
  }

  function discardAndLeave() {
    allowNavigation = true;
    showUnsavedModal = false;
    if (pendingNav) goto(pendingNav);
  }

  function stayOnPage() {
    showUnsavedModal = false;
    pendingNav = null;
  }

  // Lock page scroll while the unsaved-changes modal is open
  $effect(() => {
    if (typeof document === 'undefined') return;
    document.body.style.overflow = showUnsavedModal ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  });

  // Move the modal node out of the .page-fade wrapper (which applies a
  // transform and breaks `position: fixed` relative to the viewport)
  function portal(node: HTMLElement) {
    document.body.appendChild(node);
    return { destroy() { node.remove(); } };
  }

  // Drag state
  let dragSrcIdx = $state<number | null>(null);
  let dragOverIdx = $state<number | null>(null);
  let touchSrcIdx: number | null = null;

  function moveDrag(from: number, to: number) {
    if (from === to) return;
    const arr = [...editExercises];
    const [item] = arr.splice(from, 1);
    arr.splice(to, 0, item);
    editExercises = arr;
  }

  function onDragStart(i: number, e: DragEvent) { dragSrcIdx = i; e.dataTransfer!.effectAllowed = 'move'; }
  function onDragOver(i: number, e: DragEvent) { e.preventDefault(); dragOverIdx = i; }
  function onDrop(i: number) { if (dragSrcIdx !== null) moveDrag(dragSrcIdx, i); dragSrcIdx = null; dragOverIdx = null; }
  function onDragEnd() { dragSrcIdx = null; dragOverIdx = null; }
  function onTouchStart(i: number) { touchSrcIdx = i; dragSrcIdx = i; }

  let touchMoveHandler: ((e: TouchEvent) => void) | null = null;
  let touchEndHandler: (() => void) | null = null;

  onMount(() => {
    touchMoveHandler = (e: TouchEvent) => {
      if (touchSrcIdx === null) return;
      e.preventDefault();
      const touch = e.touches[0];
      const card = (document.elementFromPoint(touch.clientX, touch.clientY) as HTMLElement | null)?.closest('[data-exidx]') as HTMLElement | null;
      if (card?.dataset.exidx !== undefined) dragOverIdx = parseInt(card.dataset.exidx);
    };
    touchEndHandler = () => {
      if (touchSrcIdx !== null && dragOverIdx !== null && touchSrcIdx !== dragOverIdx) moveDrag(touchSrcIdx, dragOverIdx);
      touchSrcIdx = null; dragSrcIdx = null; dragOverIdx = null;
    };
    document.addEventListener('touchmove', touchMoveHandler, { passive: false });
    document.addEventListener('touchend', touchEndHandler);
  });

  onDestroy(() => {
    if (touchMoveHandler) document.removeEventListener('touchmove', touchMoveHandler);
    if (touchEndHandler) document.removeEventListener('touchend', touchEndHandler);
  });

  function removeExercise(key: number) {
    editExercises = editExercises.filter(e => e._key !== key);
  }

  function addExercise() {
    editExercises = [...editExercises, {
      _key: nextKey++, name: '', unit: 'kg',
      setRows: [{ reps: 8, weight: null }, { reps: 8, weight: null }, { reps: 8, weight: null }]
    }];
  }

  function addSet(ex: EditExercise) {
    const last = ex.setRows[ex.setRows.length - 1];
    ex.setRows = [...ex.setRows, { reps: last?.reps ?? 8, weight: last?.weight ?? null }];
  }

  function removeSet(ex: EditExercise, i: number) {
    if (ex.setRows.length === 1) return;
    ex.setRows = ex.setRows.filter((_, idx) => idx !== i);
  }

  function maxWeight(setRows: SetRow[]): number | null {
    const weights = setRows.map(s => s.weight).filter(w => w !== null) as number[];
    return weights.length > 0 ? Math.max(...weights) : null;
  }

  async function saveEdit() {
    if (!workout) return;
    saving = true;
    try {
      const exercises = editExercises.map(e => {
        const w = maxWeight(e.setRows);
        return {
          name: e.name,
          sets: e.setRows.length,
          reps: e.setRows[0]?.reps ?? 0,
          weight: w,
          unit: w !== null ? e.unit as WeightUnit : null,
          raw: '',
          set_data: JSON.stringify(e.setRows)
        };
      });
      await updateWorkout({ ...workout, title: editTitle.trim() || 'Untitled Workout', date: editDate, notes: editNotes.trim() || null, tag: editTag, exercises });
      await load();
      editing = false;
    } catch {
      error = 'Could not save changes.';
    } finally {
      saving = false;
    }
  }

  function noExp(e: KeyboardEvent) {
    if (['e', 'E', '+', '-'].includes(e.key)) e.preventDefault();
  }

  function noExpNoDot(e: KeyboardEvent) {
    if (['e', 'E', '+', '-', '.'].includes(e.key)) e.preventDefault();
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
          <input id="edit-title" type="text" bind:value={editTitle}
            class="w-full rounded-md bg-white/5 border border-white/10 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-white/20" />
        </div>

        <div class="space-y-1.5">
          <label for="edit-date" class="block text-xs font-medium text-white/40 uppercase tracking-wide">Date</label>
          <input id="edit-date" type="date" bind:value={editDate}
            class="w-full rounded-md bg-white/5 border border-white/10 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-white/20 scheme-dark" />
        </div>

        <div class="space-y-1.5">
          <label for="edit-notes" class="block text-xs font-medium text-white/40 uppercase tracking-wide">Notes</label>
          <textarea id="edit-notes" bind:value={editNotes} rows="3" placeholder="How did the session feel?"
            class="w-full rounded-md bg-white/5 border border-white/10 px-3 py-2 text-sm text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-white/20 resize-none"></textarea>
        </div>

        <div class="space-y-1.5">
          <p class="text-xs font-medium text-white/40 uppercase tracking-wide">Tag</p>
          <div class="flex gap-2 flex-wrap">
            {#each TAGS as t (t)}
              <button
                onclick={() => editTag = editTag === t ? null : t}
                class="px-3 py-1.5 rounded text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30
                  {editTag === t
                    ? 'bg-white text-neutral-950'
                    : 'bg-white/5 border border-white/10 text-white/50 hover:bg-white/10 hover:text-white active:bg-white/5'}"
              >{t}</button>
            {/each}
          </div>
        </div>

        <div class="space-y-3">
          <p class="text-xs font-medium text-white/40 uppercase tracking-wide">Exercises</p>

          {#each editExercises as exercise, exIdx (exercise._key)}
            <div
              class="rounded-md border p-4 space-y-3
                {dragOverIdx === exIdx && dragSrcIdx !== exIdx
                  ? 'bg-white/8 border-white/30'
                  : dragSrcIdx === exIdx
                    ? 'bg-white/3 border-white/10 opacity-50'
                    : 'bg-white/5 border-white/10'}"
              role="listitem"
              draggable="true"
              data-exidx={exIdx}
              ondragstart={(e) => onDragStart(exIdx, e)}
              ondragover={(e) => onDragOver(exIdx, e)}
              ondrop={() => onDrop(exIdx)}
              ondragend={onDragEnd}
            >

              <!-- Name + unit + remove -->
              <div class="flex items-start gap-2">
                <button
                  class="mt-5 cursor-grab active:cursor-grabbing text-white/20 hover:text-white/50 focus-visible:outline-none touch-none select-none"
                  aria-label="Drag to reorder"
                  ontouchstart={() => onTouchStart(exIdx)}
                >⠿</button>
                <div class="flex-1 space-y-1">
                  <label for="edit-name-{exercise._key}" class="block text-xs font-medium text-white/40 uppercase tracking-wide">Name</label>
                  <input id="edit-name-{exercise._key}" type="text" bind:value={exercise.name}
                    list="exercise-names"
                    class="w-full rounded bg-white/5 border border-white/10 px-3 py-1.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-white/20" />
                </div>
                <div class="space-y-1">
                  <label for="edit-unit-{exercise._key}" class="block text-xs font-medium text-white/40 uppercase tracking-wide">Unit</label>
                  <select id="edit-unit-{exercise._key}" bind:value={exercise.unit}
                    class="rounded bg-white/5 border border-white/10 px-3 py-1.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-white/20">
                    <option value="kg" class="bg-neutral-900">kg</option>
                    <option value="lbs" class="bg-neutral-900">lbs</option>
                  </select>
                </div>
                <button onclick={() => removeExercise(exercise._key)}
                  class="mt-5 text-white/20 hover:text-red-400 active:text-red-500 focus-visible:outline-none text-lg leading-none"
                  aria-label="Remove exercise">×</button>
              </div>

              <!-- Set rows -->
              <div class="space-y-2">
                <div class="grid grid-cols-[2rem_1fr_1fr_1.5rem] gap-2 px-1">
                  <span></span>
                  <span class="text-xs font-medium text-white/40 uppercase tracking-wide">Reps</span>
                  <span class="text-xs font-medium text-white/40 uppercase tracking-wide">Weight</span>
                  <span></span>
                </div>

                {#each exercise.setRows as row, i (i)}
                  <div class="grid grid-cols-[2rem_1fr_1fr_1.5rem] items-center gap-2">
                    <span class="text-xs text-white/30 text-right tabular-nums">{i + 1}</span>
                    <input type="number" inputmode="numeric" bind:value={row.reps} min="1"
                      onkeydown={noExpNoDot}
                      class="w-full rounded bg-white/5 border border-white/10 px-3 py-1.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-white/20" />
                    <input type="number" inputmode="decimal" min="0" step="0.5" placeholder="—"
                      value={row.weight ?? ''}
                      oninput={(e) => {
                        const v = (e.target as HTMLInputElement).valueAsNumber;
                        row.weight = isNaN(v) ? null : v;
                      }}
                      onkeydown={noExp}
                      class="w-full rounded bg-white/5 border border-white/10 px-3 py-1.5 text-sm text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-white/20" />
                    <button onclick={() => removeSet(exercise, i)}
                      disabled={exercise.setRows.length === 1}
                      class="text-white/20 hover:text-red-400 active:text-red-500 focus-visible:outline-none disabled:opacity-0 disabled:cursor-not-allowed text-base leading-none"
                      aria-label="Remove set">×</button>
                  </div>
                {/each}

                <button onclick={() => addSet(exercise)}
                  class="w-full px-3 py-1.5 rounded bg-white/5 border border-dashed border-white/10 text-xs text-white/40 hover:bg-white/10 hover:text-white active:bg-white/5 focus-visible:outline-none">
                  + Add set
                </button>
              </div>

            </div>
          {/each}

          <button onclick={addExercise}
            class="w-full px-4 py-2.5 rounded-md bg-white/5 border border-white/10 border-dashed text-sm text-white/40 hover:bg-white/10 hover:text-white active:bg-white/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/20">
            + Add exercise
          </button>
        </div>

        <div class="flex gap-3">
          <button onclick={saveEdit} disabled={saving}
            class="px-4 py-2 bg-white text-neutral-950 rounded-md text-sm font-medium hover:bg-white/90 active:bg-white/75 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50 disabled:opacity-40 disabled:cursor-not-allowed">
            {saving ? 'Saving…' : 'Save changes'}
          </button>
          <button onclick={cancelEdit}
            class="px-4 py-2 bg-white/5 border border-white/10 text-white/70 rounded-md text-sm font-medium hover:bg-white/10 hover:text-white active:bg-white/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30">
            Cancel
          </button>
        </div>
      </div>

    {:else}
      <!-- ── View mode ── -->
      <div class="flex items-start justify-between">
        <div class="space-y-1">
          <h1 class="text-2xl font-semibold tracking-tight">{workout.title}</h1>
          <div class="flex items-center gap-2">
            <p class="text-sm text-white/30">{fmt(workout.date)}</p>
            {#if workout.tag}
              <span class="px-1.5 py-0.5 rounded text-xs font-medium bg-white/10 text-white/60 border border-white/10">{workout.tag}</span>
            {/if}
          </div>
        </div>
        <div class="flex gap-2">
          <a href="/workouts/{workout.id}/save-template"
            class="px-3 py-1.5 bg-white/5 border border-white/10 text-white/60 rounded-md text-sm hover:bg-white/10 hover:text-white active:bg-white/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30">
            Use as template
          </a>
          <button onclick={startEdit}
            class="px-3 py-1.5 bg-white/5 border border-white/10 text-white/60 rounded-md text-sm hover:bg-white/10 hover:text-white active:bg-white/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30">
            Edit
          </button>
        </div>
      </div>

      {#if workout.notes}
        <div class="rounded-md bg-white/5 border border-white/10 px-4 py-3">
          <p class="text-xs font-medium text-white/40 uppercase tracking-wide mb-1.5">Notes</p>
          <p class="text-sm text-white/70 whitespace-pre-wrap">{workout.notes}</p>
        </div>
      {/if}

      <div class="rounded-md bg-white/5 border border-white/10">
        <div class="px-4 py-3 border-b border-white/10 flex items-center justify-between">
          <p class="text-xs font-medium text-white/40 uppercase tracking-wide">
            {workout.exercises.length} exercise{workout.exercises.length > 1 ? 's' : ''}
          </p>
          {#if totalVolume() > 0}
            <p class="text-xs text-white/30">{totalVolume().toLocaleString()} kg total volume</p>
          {/if}
        </div>
        <ul class="divide-y divide-white/5">
          {#each workout.exercises as exercise, i (i)}
            {@const isPR = exercise.weight !== null && exercise.weight === prMap().get(exercise.name)}
            <li class="px-4 py-3 space-y-1">
              <div class="flex items-center gap-2">
                <p class="font-medium text-white">{exercise.name}</p>
                {#if isPR}
                  <span class="px-1.5 py-0.5 rounded text-xs font-semibold bg-amber-500/15 text-amber-400 border border-amber-500/25">PR</span>
                {/if}
              </div>
              {#if exercise.set_data}
                {@const parsed = JSON.parse(exercise.set_data)}
                {#if parsed.cardio}
                  {@const { distanceKm, timeSeconds } = parsed}
                  {@const pSec = timeSeconds / distanceKm}
                  <div class="flex gap-6 text-sm text-white/40">
                    <span>{distanceKm} km</span>
                    <span>{Math.floor(timeSeconds / 60)}:{String(timeSeconds % 60).padStart(2, '0')}</span>
                    <span>{Math.floor(pSec / 60)}:{String(Math.round(pSec % 60)).padStart(2, '0')}/km</span>
                  </div>
                {:else}
                  {@const rows = parsed as SetRow[]}
                  <div class="space-y-0.5">
                    {#each rows as row, si (si)}
                      <p class="text-sm text-white/40">
                        Set {si + 1}: {row.reps} reps{row.weight !== null ? ` @ ${row.weight}${exercise.unit}` : ' · bodyweight'}
                      </p>
                    {/each}
                  </div>
                {/if}
              {:else}
                <p class="text-sm text-white/40">
                  {exercise.sets} sets × {exercise.reps} reps{exercise.weight !== null ? ` · ${exercise.weight}${exercise.unit}` : ' · bodyweight'}
                </p>
              {/if}
            </li>
          {/each}
        </ul>
      </div>
    {/if}

  </div>
</div>

{#if showUnsavedModal}
  <div use:portal class="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-6">
    <div class="relative w-full max-w-sm rounded-md bg-neutral-900 border border-white/10 p-5 space-y-4 shadow-2xl">
      <button
        onclick={stayOnPage} disabled={saving}
        aria-label="Close"
        class="absolute top-2 right-2 w-8 h-8 flex items-center justify-center text-white/40 hover:text-white active:text-white/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30 rounded text-lg leading-none disabled:opacity-40"
      >×</button>
      <div class="space-y-1 pr-6">
        <p class="text-base font-semibold text-white">Unsaved changes</p>
        <p class="text-sm text-white/50">Do you want to save your changes before leaving?</p>
      </div>
      <div class="flex flex-col gap-2">
        <button
          onclick={saveAndLeave} disabled={saving}
          class="w-full px-4 py-2 bg-white text-neutral-950 rounded-md text-sm font-medium hover:bg-white/90 active:bg-white/75 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {saving ? 'Saving…' : 'Save & leave'}
        </button>
        <button
          onclick={discardAndLeave} disabled={saving}
          class="w-full px-4 py-2 bg-white/5 border border-white/10 text-white/70 rounded-md text-sm font-medium hover:bg-white/10 hover:text-white active:bg-white/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Discard changes
        </button>
      </div>
    </div>
  </div>
{/if}

<datalist id="exercise-names">
  {#each exerciseNameSuggestions() as name (name)}
    <option value={name}></option>
  {/each}
</datalist>
