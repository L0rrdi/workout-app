<!-- src/routes/workouts/new/+page.svelte -->
<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { createWorkout, generateId, fetchWorkouts } from '$lib/storage';
  import type { SetRow, Workout } from '$lib/storage';
  import type { WeightUnit } from '$lib/parser';

  type FormExercise = { _key: number; name: string; unit: string; setRows: SetRow[] };
  type TemplateExercise = { name: string; sets: number; reps: number | null; weight: number | null; unit: string | null };
  type Template = { id: string; title: string; tag: string | null; exercises: TemplateExercise[] };

  const today = new Date().toISOString().split('T')[0];
  const TAGS = ['Strength', 'Hypertrophy', 'Cardio'];

  let title = $state('Workout');
  let date = $state(today);
  let notes = $state('');
  let tag = $state<string | null>(null);

  // Cardio state
  let cardioActivity = $state('Run');
  let cardioDistance = $state(0);
  let cardioMinutes = $state(0);
  let cardioSeconds = $state(0);

  const cardioPace = $derived(() => {
    if (cardioDistance <= 0) return null;
    const total = cardioMinutes * 60 + cardioSeconds;
    if (total <= 0) return null;
    const secPerKm = total / cardioDistance;
    const m = Math.floor(secPerKm / 60);
    const s = Math.round(secPerKm % 60);
    return `${m}:${String(s).padStart(2, '0')}/km`;
  });

  let exercises = $state<FormExercise[]>([{ _key: 0, name: '', unit: 'kg', setRows: [{reps: 8, weight: null}, {reps: 8, weight: null}, {reps: 8, weight: null}] }]);
  let nextKey = 1;
  let saving = $state(false);
  let error = $state('');
  let templates = $state<Template[]>([]);
  let showTemplates = $state(false);
  let allWorkouts = $state<Workout[]>([]);
  let hasDraft = $state(false);
  let draftReady = $state(false);

  // Draft
  const DRAFT_KEY = 'workout_draft';

  function saveDraft() {
    const draft = { title, date, notes, tag, exercises, nextKey, cardioActivity, cardioDistance, cardioMinutes, cardioSeconds };
    localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
    hasDraft = true;
  }

  function loadDraft() {
    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      if (!raw) return;
      const d = JSON.parse(raw);
      title = d.title ?? title;
      date = d.date ?? date;
      notes = d.notes ?? notes;
      tag = d.tag ?? null;
      exercises = d.exercises ?? exercises;
      nextKey = d.nextKey ?? nextKey;
      cardioActivity = d.cardioActivity ?? cardioActivity;
      cardioDistance = d.cardioDistance ?? cardioDistance;
      cardioMinutes = d.cardioMinutes ?? cardioMinutes;
      cardioSeconds = d.cardioSeconds ?? cardioSeconds;
      hasDraft = true;
    } catch { /* ignore corrupt draft */ }
  }

  function discardDraft() {
    localStorage.removeItem(DRAFT_KEY);
    hasDraft = false;
    title = 'Workout';
    date = today;
    notes = '';
    tag = null;
    exercises = [{ _key: 0, name: '', unit: 'kg', setRows: [{reps: 8, weight: null}, {reps: 8, weight: null}, {reps: 8, weight: null}] }];
    nextKey = 1;
    cardioActivity = 'Run';
    cardioDistance = 0;
    cardioMinutes = 0;
    cardioSeconds = 0;
  }

  // Save draft on every state change (after the initial load completes)
  $effect(() => {
    // Read all draft fields so the effect tracks them
    JSON.stringify({ title, date, notes, tag, exercises, cardioActivity, cardioDistance, cardioMinutes, cardioSeconds });
    if (draftReady) saveDraft();
  });

  // Drag state
  let dragSrcIdx = $state<number | null>(null);
  let dragOverIdx = $state<number | null>(null);
  let touchSrcIdx: number | null = null;

  function moveDrag(from: number, to: number) {
    if (from === to) return;
    const arr = [...exercises];
    const [item] = arr.splice(from, 1);
    arr.splice(to, 0, item);
    exercises = arr;
  }

  function onDragStart(i: number, e: DragEvent) {
    dragSrcIdx = i;
    e.dataTransfer!.effectAllowed = 'move';
  }

  function onDragOver(i: number, e: DragEvent) {
    e.preventDefault();
    dragOverIdx = i;
  }

  function onDrop(i: number) {
    if (dragSrcIdx !== null) moveDrag(dragSrcIdx, i);
    dragSrcIdx = null;
    dragOverIdx = null;
  }

  function onDragEnd() {
    dragSrcIdx = null;
    dragOverIdx = null;
  }

  function onTouchStart(i: number) {
    touchSrcIdx = i;
    dragSrcIdx = i;
  }

  // Template edit state
  let editingTemplateId = $state<string | null>(null);
  let editTitle = $state('');
  let editExercises = $state<TemplateExercise[]>([]);

  function startEditTemplate(t: Template) {
    editingTemplateId = t.id;
    editTitle = t.title;
    editExercises = t.exercises.map(e => ({ ...e }));
  }

  function cancelEdit() {
    editingTemplateId = null;
  }

  async function saveEditTemplate() {
    if (!editingTemplateId) return;
    const res = await fetch(`/api/templates?id=${editingTemplateId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: editTitle.trim() || 'Template', exercises: editExercises })
    });
    if (res.ok) {
      templates = templates.map(t =>
        t.id === editingTemplateId
          ? { ...t, title: editTitle.trim() || 'Template', exercises: editExercises.map(e => ({ ...e })) }
          : t
      );
      editingTemplateId = null;
    }
  }

  function addEditExercise() {
    editExercises = [...editExercises, { name: '', sets: 3, reps: 8, weight: null, unit: 'kg' }];
  }

  function removeEditExercise(i: number) {
    editExercises = editExercises.filter((_, idx) => idx !== i);
  }

  // Touch handlers stored for cleanup
  let touchMoveHandler: ((e: TouchEvent) => void) | null = null;
  let touchEndHandler: (() => void) | null = null;

  onMount(async () => {
    loadDraft();
    draftReady = true;

    touchMoveHandler = (e: TouchEvent) => {
      if (touchSrcIdx === null) return;
      e.preventDefault();
      const touch = e.touches[0];
      const el = document.elementFromPoint(touch.clientX, touch.clientY);
      const card = el?.closest('[data-exidx]') as HTMLElement | null;
      if (card?.dataset.exidx !== undefined) {
        dragOverIdx = parseInt(card.dataset.exidx);
      }
    };

    touchEndHandler = () => {
      if (touchSrcIdx !== null && dragOverIdx !== null && touchSrcIdx !== dragOverIdx) {
        moveDrag(touchSrcIdx, dragOverIdx);
      }
      touchSrcIdx = null;
      dragSrcIdx = null;
      dragOverIdx = null;
    };

    document.addEventListener('touchmove', touchMoveHandler, { passive: false });
    document.addEventListener('touchend', touchEndHandler);

    const [tRes, workouts] = await Promise.all([
      fetch('/api/templates'),
      fetchWorkouts()
    ]);
    if (tRes.ok) templates = await tRes.json();
    allWorkouts = workouts;
  });

  onDestroy(() => {
    if (touchMoveHandler) document.removeEventListener('touchmove', touchMoveHandler);
    if (touchEndHandler) document.removeEventListener('touchend', touchEndHandler);
  });

  function findLastExercise(exerciseName: string) {
    const name = exerciseName.trim().toLowerCase();
    if (!name) return null;
    // First pass: same tag. Second pass: any tag as fallback.
    for (const sameTagOnly of [true, false]) {
      for (const w of allWorkouts) {
        if (sameTagOnly && (w.tag ?? null) !== (tag ?? null)) continue;
        const ex = w.exercises.find(e => e.name.toLowerCase() === name);
        if (ex) return ex;
      }
    }
    return null;
  }

  function getLastWeightStr(exerciseName: string, setIndex: number): string | null {
    const ex = findLastExercise(exerciseName);
    if (!ex) return null;
    if (ex.set_data) {
      try {
        const rows = JSON.parse(ex.set_data);
        if (!Array.isArray(rows)) return null;
        const row = (rows as SetRow[])[setIndex];
        if (row === undefined) return null;
        return row.weight !== null ? `${row.weight}${ex.unit ?? 'kg'}` : 'bw';
      } catch { return null; }
    }
    if (setIndex === 0) return ex.weight !== null ? `${ex.weight}${ex.unit ?? 'kg'}` : 'bw';
    return null;
  }

  function getLastReps(exerciseName: string, weight: number | null): number | null {
    const ex = findLastExercise(exerciseName);
    if (!ex) return null;
    if (ex.set_data) {
      try {
        const rows = JSON.parse(ex.set_data);
        if (!Array.isArray(rows)) return null;
        const match = (rows as SetRow[]).find(r => r.weight === weight);
        return match !== undefined ? match.reps : null;
      } catch { return null; }
    }
    return ex.weight === weight ? ex.reps : null;
  }

  function applyTemplate(t: Template) {
    title = t.title;
    tag = t.tag;
    date = new Date().toISOString().split('T')[0];
    nextKey = t.exercises.length;
    exercises = t.exercises.map((e, i) => ({
      _key: i,
      name: e.name,
      unit: e.unit ?? 'kg',
      setRows: Array.from({ length: e.sets }, () => ({ reps: e.reps, weight: e.weight }))
    }));
    showTemplates = false;
  }

  async function deleteTemplate(id: string) {
    await fetch(`/api/templates?id=${id}`, { method: 'DELETE' });
    templates = templates.filter(t => t.id !== id);
  }

  function addExercise() {
    exercises = [...exercises, { _key: nextKey++, name: '', unit: 'kg', setRows: [{reps: 8, weight: null}, {reps: 8, weight: null}, {reps: 8, weight: null}] }];
  }

  function removeExercise(key: number) {
    exercises = exercises.filter(e => e._key !== key);
  }

  function addSet(ex: FormExercise) {
    const last = ex.setRows[ex.setRows.length - 1];
    ex.setRows = [...ex.setRows, { reps: last?.reps ?? 8, weight: last?.weight ?? null }];
  }

  function removeSet(ex: FormExercise, i: number) {
    if (ex.setRows.length === 1) return;
    ex.setRows = ex.setRows.filter((_, idx) => idx !== i);
  }

  function maxWeight(setRows: SetRow[]): number | null {
    const weights = setRows.map(s => s.weight).filter(w => w !== null) as number[];
    return weights.length > 0 ? Math.max(...weights) : null;
  }

  function noExp(e: KeyboardEvent) {
    if (['e', 'E', '+', '-'].includes(e.key)) e.preventDefault();
  }

  function noExpNoDot(e: KeyboardEvent) {
    if (['e', 'E', '+', '-', '.'].includes(e.key)) e.preventDefault();
  }

  async function save() {
    saving = true;
    error = '';
    try {
      let parsedExercises;
      if (tag === 'Cardio') {
        const totalSec = cardioMinutes * 60 + cardioSeconds;
        const timeStr = `${cardioMinutes}:${String(cardioSeconds).padStart(2, '0')}`;
        const pace = cardioPace();
        parsedExercises = [{
          name: cardioActivity.trim() || 'Run',
          sets: 1,
          reps: 1,
          weight: null,
          unit: null,
          raw: `${cardioDistance}km in ${timeStr}${pace ? ` (${pace} pace)` : ''}`,
          set_data: JSON.stringify({ cardio: true, distanceKm: cardioDistance, timeSeconds: totalSec })
        }];
      } else {
        parsedExercises = exercises
          .filter(e => e.name.trim())
          .map(e => {
            const w = maxWeight(e.setRows);
            return {
              name: e.name.trim(),
              sets: e.setRows.length,
              reps: e.setRows[0]?.reps ?? 0,
              weight: w,
              unit: w !== null ? e.unit as WeightUnit : null,
              raw: '',
              set_data: JSON.stringify(e.setRows)
            };
          });
      }
      const defaultTitle = tag === 'Cardio' ? 'Cardio' : 'Workout';
      await createWorkout({ id: generateId(), title: title.trim() || defaultTitle, date, notes: notes.trim() || null, tag, exercises: parsedExercises });
      localStorage.removeItem(DRAFT_KEY);
      window.location.href = '/workouts';
    } catch {
      error = 'Could not save workout.';
      saving = false;
    }
  }
</script>

<svelte:head><title>New Workout</title></svelte:head>

<div class="min-h-screen bg-neutral-950 text-white">
  <div class="max-w-2xl mx-auto px-6 py-10 space-y-6">

    <a
      href="/workouts"
      class="inline-flex items-center gap-1 text-sm text-white/40 hover:text-white active:text-white/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30 rounded"
    >
      ← Back
    </a>

    <div class="flex items-center justify-between">
      <div class="flex items-center gap-3">
        <h1 class="text-2xl font-semibold tracking-tight">New Workout</h1>
        {#if hasDraft}
          <span class="text-xs px-2 py-0.5 rounded-full bg-white/10 border border-white/10 text-white/50">Draft</span>
        {/if}
      </div>
      <div class="flex items-center gap-2">
        {#if hasDraft}
          <button
            onclick={discardDraft}
            class="px-3 py-1.5 text-sm text-white/40 hover:text-white active:text-white/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30 rounded"
          >Discard draft</button>
        {/if}
        {#if templates.length > 0 && tag !== 'Cardio'}
          <button
            onclick={() => showTemplates = !showTemplates}
            class="px-3 py-1.5 bg-white/5 border border-white/10 text-white/60 rounded-md text-sm hover:bg-white/10 hover:text-white active:bg-white/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30"
          >
            Templates
          </button>
        {/if}
      </div>
    </div>

    {#if showTemplates}
      <div class="rounded-md bg-white/5 border border-white/10 divide-y divide-white/5">
        {#each templates as t (t.id)}
          {#if editingTemplateId === t.id}
            <!-- Inline edit form -->
            <div class="p-4 space-y-3">
              <input
                type="text" bind:value={editTitle}
                placeholder="Template name"
                class="w-full rounded bg-white/5 border border-white/10 px-3 py-1.5 text-sm text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-white/20"
              />
              <div class="space-y-2">
                {#each editExercises as ex, i (i)}
                  <div class="grid grid-cols-[1fr_3rem_3rem_4rem_3rem_1.5rem] items-center gap-2">
                    <input
                      type="text" bind:value={ex.name}
                      placeholder="Exercise"
                      class="rounded bg-white/5 border border-white/10 px-2 py-1.5 text-sm text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-white/20"
                    />
                    <input
                      type="number" inputmode="numeric" bind:value={ex.sets} min="1"
                      title="Sets"
                      onkeydown={noExpNoDot}
                      class="rounded bg-white/5 border border-white/10 px-2 py-1.5 text-sm text-white text-center focus:outline-none focus:ring-2 focus:ring-white/20"
                    />
                    <input
                      type="number" inputmode="numeric" bind:value={ex.reps} min="1"
                      title="Reps"
                      onkeydown={noExpNoDot}
                      class="rounded bg-white/5 border border-white/10 px-2 py-1.5 text-sm text-white text-center focus:outline-none focus:ring-2 focus:ring-white/20"
                    />
                    <input
                      type="number" inputmode="decimal" min="0" step="0.5"
                      value={ex.weight ?? ''}
                      oninput={(e) => { const v = (e.target as HTMLInputElement).valueAsNumber; ex.weight = isNaN(v) ? null : v; }}
                      title="Weight"
                      placeholder="—"
                      onkeydown={noExp}
                      class="rounded bg-white/5 border border-white/10 px-2 py-1.5 text-sm text-white placeholder:text-white/30 text-center focus:outline-none focus:ring-2 focus:ring-white/20"
                    />
                    <select
                      bind:value={ex.unit}
                      class="rounded bg-white/5 border border-white/10 px-1 py-1.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-white/20"
                    >
                      <option value="kg" class="bg-neutral-900">kg</option>
                      <option value="lbs" class="bg-neutral-900">lbs</option>
                    </select>
                    <button
                      onclick={() => removeEditExercise(i)}
                      class="text-white/20 hover:text-red-400 active:text-red-500 focus-visible:outline-none text-lg leading-none"
                      aria-label="Remove"
                    >×</button>
                  </div>
                {/each}
                <div class="grid grid-cols-[1fr_3rem_3rem_4rem_3rem_1.5rem] gap-2 pt-0.5">
                  <p class="text-[10px] text-white/30 pl-1">Name</p>
                  <p class="text-[10px] text-white/30 text-center">Sets</p>
                  <p class="text-[10px] text-white/30 text-center">Reps</p>
                  <p class="text-[10px] text-white/30 text-center">Wt</p>
                  <p class="text-[10px] text-white/30 text-center">Unit</p>
                  <span></span>
                </div>
              </div>
              <button
                onclick={addEditExercise}
                class="w-full px-3 py-1.5 rounded bg-white/5 border border-dashed border-white/10 text-xs text-white/40 hover:bg-white/10 hover:text-white active:bg-white/5 focus-visible:outline-none"
              >+ Add exercise</button>
              <div class="flex gap-2 justify-end pt-1">
                <button
                  onclick={cancelEdit}
                  class="px-3 py-1.5 text-sm text-white/40 hover:text-white active:text-white/60 focus-visible:outline-none rounded"
                >Cancel</button>
                <button
                  onclick={saveEditTemplate}
                  class="px-3 py-1.5 bg-white text-neutral-950 rounded text-sm font-medium hover:bg-white/90 active:bg-white/75 focus-visible:outline-none"
                >Save</button>
              </div>
            </div>
          {:else}
            <!-- Normal template row -->
            <div class="flex items-center justify-between px-4 py-3">
              <div>
                <div class="flex items-center gap-2">
                  <p class="text-sm font-medium text-white">{t.title}</p>
                  {#if t.tag}
                    <span class="px-1.5 py-0.5 rounded text-xs font-medium bg-white/10 text-white/60 border border-white/10">{t.tag}</span>
                  {/if}
                </div>
                <p class="text-xs text-white/40">{t.exercises.length} exercise{t.exercises.length !== 1 ? 's' : ''}</p>
              </div>
              <div class="flex gap-2">
                <button
                  onclick={() => applyTemplate(t)}
                  class="px-3 py-1.5 bg-white text-neutral-950 rounded text-xs font-medium hover:bg-white/90 active:bg-white/75 focus-visible:outline-none"
                >Use</button>
                <button
                  onclick={() => startEditTemplate(t)}
                  class="px-2 py-1.5 text-white/40 hover:text-white active:text-white/60 focus-visible:outline-none text-xs rounded"
                >Edit</button>
                <button
                  onclick={() => deleteTemplate(t.id)}
                  class="px-2 py-1.5 text-white/30 hover:text-red-400 active:text-red-500 focus-visible:outline-none text-xs rounded"
                >Delete</button>
              </div>
            </div>
          {/if}
        {/each}
      </div>
    {/if}

    <div class="space-y-5">

      <!-- Title -->
      <div class="space-y-1.5">
        <label for="title" class="block text-xs font-medium text-white/40 uppercase tracking-wide">Title</label>
        <input
          id="title" type="text" bind:value={title}
          class="w-full rounded-md bg-white/5 border border-white/10 px-3 py-2 text-sm text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-white/20"
        />
      </div>

      <!-- Date -->
      <div class="space-y-1.5">
        <label for="date" class="block text-xs font-medium text-white/40 uppercase tracking-wide">Date</label>
        <input
          id="date" type="date" bind:value={date}
          class="w-full rounded-md bg-white/5 border border-white/10 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-white/20 scheme-dark"
        />
      </div>

      <!-- Notes -->
      <div class="space-y-1.5">
        <label for="notes" class="block text-xs font-medium text-white/40 uppercase tracking-wide">Notes</label>
        <textarea
          id="notes" bind:value={notes} rows="3" placeholder="How did the session feel?"
          class="w-full rounded-md bg-white/5 border border-white/10 px-3 py-2 text-sm text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-white/20 resize-none"
        ></textarea>
      </div>

      <!-- Tag -->
      <div class="space-y-1.5">
        <p class="text-xs font-medium text-white/40 uppercase tracking-wide">Tag</p>
        <div class="flex gap-2 flex-wrap">
          {#each TAGS as t (t)}
            <button
              onclick={() => tag = tag === t ? null : t}
              class="px-3 py-1.5 rounded text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30
                {tag === t
                  ? 'bg-white text-neutral-950'
                  : 'bg-white/5 border border-white/10 text-white/50 hover:bg-white/10 hover:text-white active:bg-white/5'}"
            >{t}</button>
          {/each}
        </div>
      </div>

      {#if tag === 'Cardio'}
        <!-- Cardio form -->
        <div class="rounded-md bg-white/5 border border-white/10 p-4 space-y-4">

          <!-- Activity -->
          <div class="space-y-1.5">
            <label for="cardio-activity" class="block text-xs font-medium text-white/40 uppercase tracking-wide">Activity</label>
            <input
              id="cardio-activity" type="text" bind:value={cardioActivity}
              placeholder="Run"
              class="w-full rounded bg-white/5 border border-white/10 px-3 py-2 text-sm text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-white/20"
            />
          </div>

          <!-- Distance -->
          <div class="space-y-1.5">
            <label for="cardio-distance" class="block text-xs font-medium text-white/40 uppercase tracking-wide">Distance (km)</label>
            <input
              id="cardio-distance" type="number" inputmode="decimal" min="0" step="0.01"
              value={cardioDistance || ''}
              oninput={(e) => { const v = parseFloat((e.target as HTMLInputElement).value); cardioDistance = isNaN(v) ? 0 : v; }}
              placeholder="5.0"
              onkeydown={noExp}
              class="w-full rounded bg-white/5 border border-white/10 px-3 py-2 text-sm text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-white/20"
            />
          </div>

          <!-- Time -->
          <div class="space-y-1.5">
            <p class="text-xs font-medium text-white/40 uppercase tracking-wide">Time</p>
            <div class="flex items-center gap-2">
              <div class="flex-1 space-y-1">
                <label for="cardio-min" class="block text-xs text-white/30">Min</label>
                <input
                  id="cardio-min" type="number" inputmode="numeric" min="0" bind:value={cardioMinutes}
                  onkeydown={noExpNoDot}
                  class="w-full rounded bg-white/5 border border-white/10 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-white/20"
                />
              </div>
              <span class="text-white/30 mt-5">:</span>
              <div class="flex-1 space-y-1">
                <label for="cardio-sec" class="block text-xs text-white/30">Sec</label>
                <input
                  id="cardio-sec" type="number" inputmode="numeric" min="0" max="59" bind:value={cardioSeconds}
                  onkeydown={noExpNoDot}
                  class="w-full rounded bg-white/5 border border-white/10 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-white/20"
                />
              </div>
            </div>
          </div>

          <!-- Pace -->
          {#if cardioPace()}
            <div class="pt-1 border-t border-white/5">
              <p class="text-xs text-white/40 uppercase tracking-wide font-medium">Pace</p>
              <p class="text-2xl font-semibold mt-1">{cardioPace()}</p>
            </div>
          {/if}

        </div>

      {:else}
        <!-- Exercises -->
        <div class="space-y-3">
          <p class="text-xs font-medium text-white/40 uppercase tracking-wide">Exercises</p>

          {#each exercises as exercise, exIdx (exercise._key)}
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
                <!-- Drag handle -->
                <button
                  class="mt-5 cursor-grab active:cursor-grabbing text-white/20 hover:text-white/50 focus-visible:outline-none touch-none select-none"
                  aria-label="Drag to reorder"
                  ontouchstart={() => onTouchStart(exIdx)}
                >⠿</button>
                <div class="flex-1 space-y-1">
                  <label for="name-{exercise._key}" class="block text-xs font-medium text-white/40 uppercase tracking-wide">Exercise name</label>
                  <input
                    id="name-{exercise._key}" type="text" bind:value={exercise.name}
                    placeholder="e.g. Bench Press"
                    class="w-full rounded bg-white/5 border border-white/10 px-3 py-1.5 text-sm text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-white/20"
                  />
                </div>
                <div class="space-y-1">
                  <label for="unit-{exercise._key}" class="block text-xs font-medium text-white/40 uppercase tracking-wide">Unit</label>
                  <select
                    id="unit-{exercise._key}" bind:value={exercise.unit}
                    class="rounded bg-white/5 border border-white/10 px-3 py-1.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-white/20"
                  >
                    <option value="kg" class="bg-neutral-900">kg</option>
                    <option value="lbs" class="bg-neutral-900">lbs</option>
                  </select>
                </div>
                <button
                  onclick={() => removeExercise(exercise._key)}
                  class="mt-5 text-white/20 hover:text-red-400 active:text-red-500 focus-visible:outline-none text-lg leading-none"
                  aria-label="Remove exercise"
                >×</button>
              </div>

              <!-- Set rows -->
              <div class="space-y-2">
                <div class="grid grid-cols-[2rem_1fr_1fr_1.5rem] gap-2 px-1">
                  <span class="text-xs text-white/30 uppercase tracking-wide"></span>
                  <span class="text-xs font-medium text-white/40 uppercase tracking-wide">Reps</span>
                  <span class="text-xs font-medium text-white/40 uppercase tracking-wide">Weight</span>
                  <span></span>
                </div>

                {#each exercise.setRows as row, i (i)}
                  <div class="grid grid-cols-[2rem_1fr_1fr_1.5rem] items-center gap-2">
                    <span class="text-xs text-white/30 text-right tabular-nums">{i + 1}</span>
                    <div class="space-y-0.5">
                      <input
                        type="number" inputmode="numeric" bind:value={row.reps} min="1"
                        onkeydown={noExpNoDot}
                        class="w-full rounded bg-white/5 border border-white/10 px-3 py-1.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-white/20"
                      />
                      {#if getLastReps(exercise.name, row.weight) !== null}
                        <p class="text-[10px] text-white/25 pl-1">{getLastReps(exercise.name, row.weight)} last</p>
                      {/if}
                    </div>
                    <div class="space-y-0.5">
                      <input
                        type="number" inputmode="decimal" min="0" step="0.5" placeholder="—"
                        value={row.weight ?? ''}
                        oninput={(e) => {
                          const v = (e.target as HTMLInputElement).valueAsNumber;
                          row.weight = isNaN(v) ? null : v;
                        }}
                        onkeydown={noExp}
                        class="w-full rounded bg-white/5 border border-white/10 px-3 py-1.5 text-sm text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-white/20"
                      />
                      {#if getLastWeightStr(exercise.name, i) !== null}
                        <p class="text-[10px] text-white/25 pl-1">{getLastWeightStr(exercise.name, i)} last</p>
                      {/if}
                    </div>
                    <button
                      onclick={() => removeSet(exercise, i)}
                      disabled={exercise.setRows.length === 1}
                      class="text-white/20 hover:text-red-400 active:text-red-500 focus-visible:outline-none disabled:opacity-0 disabled:cursor-not-allowed text-base leading-none"
                      aria-label="Remove set"
                    >×</button>
                  </div>
                {/each}

                <button
                  onclick={() => addSet(exercise)}
                  class="w-full px-3 py-1.5 rounded bg-white/5 border border-dashed border-white/10 text-xs text-white/40 hover:bg-white/10 hover:text-white active:bg-white/5 focus-visible:outline-none"
                >
                  + Add set
                </button>
              </div>

            </div>
          {/each}

          <button
            onclick={addExercise}
            class="w-full px-4 py-2.5 rounded-md bg-white/5 border border-dashed border-white/10 text-sm text-white/40 hover:bg-white/10 hover:text-white active:bg-white/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/20"
          >
            + Add exercise
          </button>
        </div>
      {/if}

      {#if error}
        <p class="text-sm text-red-400">{error}</p>
      {/if}

      <button
        onclick={save} disabled={saving}
        class="w-full px-4 py-2.5 bg-white text-neutral-950 rounded-md text-sm font-medium hover:bg-white/90 active:bg-white/75 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50 disabled:opacity-40 disabled:cursor-not-allowed"
      >
        {saving ? 'Saving…' : 'Save workout'}
      </button>

    </div>
  </div>
</div>
