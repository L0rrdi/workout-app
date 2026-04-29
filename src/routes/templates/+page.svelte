<!-- src/routes/templates/+page.svelte -->
<script lang="ts">
  import { onMount } from 'svelte';

  type TemplateExercise = { name: string; sets: number; reps: number | null; weight: number | null; unit: string | null };
  type Template = { id: string; title: string; tag: string | null; exercises: TemplateExercise[] };

  const TAGS = ['Strength', 'Hypertrophy', 'Cardio'];

  let templates = $state<Template[]>([]);
  let loading = $state(true);
  let confirmDeleteId = $state<string | null>(null);

  // Edit state
  let editingId = $state<string | null>(null);
  let editTitle = $state('');
  let editTag = $state<string | null>(null);
  let editExercises = $state<TemplateExercise[]>([]);
  let saving = $state(false);

  async function load() {
    const res = await fetch('/api/templates');
    if (res.ok) templates = await res.json();
    loading = false;
  }

  async function deleteTemplate(id: string) {
    const res = await fetch(`/api/templates?id=${id}`, { method: 'DELETE' });
    if (res.ok) templates = templates.filter(t => t.id !== id);
    confirmDeleteId = null;
  }

  function startEdit(t: Template) {
    editingId = t.id;
    editTitle = t.title;
    editTag = t.tag;
    editExercises = t.exercises.map(e => ({ ...e }));
  }

  function cancelEdit() {
    editingId = null;
  }

  function addEditExercise() {
    editExercises = [...editExercises, { name: '', sets: 3, reps: null, weight: null, unit: 'kg' }];
  }

  function removeEditExercise(i: number) {
    editExercises = editExercises.filter((_, idx) => idx !== i);
  }

  async function saveEdit() {
    if (!editingId) return;
    saving = true;
    try {
      const res = await fetch(`/api/templates?id=${editingId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: editTitle.trim() || 'Template',
          tag: editTag,
          exercises: editExercises
        })
      });
      if (!res.ok) throw new Error();
      templates = templates.map(t =>
        t.id === editingId
          ? { ...t, title: editTitle.trim() || 'Template', tag: editTag, exercises: editExercises.map(e => ({ ...e })) }
          : t
      );
      editingId = null;
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

  onMount(load);
</script>

<svelte:head><title>Templates</title></svelte:head>

<div class="min-h-screen bg-neutral-950 text-white">
  <div class="max-w-2xl mx-auto px-6 py-10 space-y-6">

    <a
      href="/workouts"
      class="inline-flex items-center gap-1 text-sm text-white/40 hover:text-white active:text-white/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30 rounded"
    >
      ← Back
    </a>

    <div class="flex items-center justify-between">
      <h1 class="text-2xl font-semibold tracking-tight">Templates</h1>
      <a
        href="/workouts/new"
        class="px-3 py-1.5 bg-white text-neutral-950 rounded-md text-sm font-medium hover:bg-white/90 active:bg-white/75 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50"
      >
        + New workout
      </a>
    </div>

    {#if loading}
      <div class="space-y-3 animate-pulse">
        {#each [1, 2, 3] as i (i)}
          <div class="rounded-md bg-white/5 border border-white/10 px-4 py-3 h-16"></div>
        {/each}
      </div>

    {:else if templates.length === 0}
      <div class="rounded-md bg-white/5 border border-white/10 p-8 text-center space-y-2">
        <p class="text-sm text-white/50">No templates yet</p>
        <p class="text-xs text-white/30">Open a workout and click "Use as template" to save its exercises as a reusable template.</p>
      </div>

    {:else}
      <div class="rounded-md bg-white/5 border border-white/10 divide-y divide-white/5">
        {#each templates as t (t.id)}
          {#if editingId === t.id}
            <!-- Inline edit form -->
            <div class="p-4 space-y-3">
              <input
                type="text" bind:value={editTitle}
                placeholder="Template name"
                class="w-full rounded bg-white/5 border border-white/10 px-3 py-1.5 text-sm text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-white/20"
              />

              <div class="space-y-1.5">
                <p class="text-xs font-medium text-white/40 uppercase tracking-wide">Tag</p>
                <div class="flex gap-2 flex-wrap">
                  {#each TAGS as tag (tag)}
                    <button
                      onclick={() => editTag = editTag === tag ? null : tag}
                      class="px-3 py-1 rounded text-xs font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30
                        {editTag === tag
                          ? 'bg-white text-neutral-950'
                          : 'bg-white/5 border border-white/10 text-white/50 hover:bg-white/10 hover:text-white active:bg-white/5'}"
                    >{tag}</button>
                  {/each}
                </div>
              </div>

              <div class="space-y-2">
                <div class="grid grid-cols-[1fr_3rem_3rem_4rem_3rem_1.5rem] gap-2 px-1">
                  <p class="text-[10px] text-white/30">Name</p>
                  <p class="text-[10px] text-white/30 text-center">Sets</p>
                  <p class="text-[10px] text-white/30 text-center">Reps</p>
                  <p class="text-[10px] text-white/30 text-center">Wt</p>
                  <p class="text-[10px] text-white/30 text-center">Unit</p>
                  <span></span>
                </div>
                {#each editExercises as ex, i (i)}
                  <div class="grid grid-cols-[1fr_3rem_3rem_4rem_3rem_1.5rem] items-center gap-2">
                    <input
                      type="text" bind:value={ex.name}
                      placeholder="Exercise"
                      class="rounded bg-white/5 border border-white/10 px-2 py-1.5 text-sm text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-white/20"
                    />
                    <input
                      type="number" inputmode="numeric" bind:value={ex.sets} min="1"
                      onkeydown={noExpNoDot}
                      title="Sets"
                      class="rounded bg-white/5 border border-white/10 px-2 py-1.5 text-sm text-white text-center focus:outline-none focus:ring-2 focus:ring-white/20"
                    />
                    <input
                      type="number" inputmode="numeric" min="1"
                      value={ex.reps ?? ''}
                      oninput={(e) => { const v = (e.target as HTMLInputElement).valueAsNumber; ex.reps = isNaN(v) ? null : v; }}
                      onkeydown={noExpNoDot}
                      title="Reps"
                      placeholder="—"
                      class="rounded bg-white/5 border border-white/10 px-2 py-1.5 text-sm text-white placeholder:text-white/30 text-center focus:outline-none focus:ring-2 focus:ring-white/20"
                    />
                    <input
                      type="number" inputmode="decimal" min="0" step="0.5"
                      value={ex.weight ?? ''}
                      oninput={(e) => { const v = (e.target as HTMLInputElement).valueAsNumber; ex.weight = isNaN(v) ? null : v; }}
                      onkeydown={noExp}
                      title="Weight"
                      placeholder="—"
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
              </div>

              <button
                onclick={addEditExercise}
                class="w-full px-3 py-1.5 rounded bg-white/5 border border-dashed border-white/10 text-xs text-white/40 hover:bg-white/10 hover:text-white active:bg-white/5 focus-visible:outline-none"
              >+ Add exercise</button>

              <div class="flex gap-2 justify-end pt-1">
                <button
                  onclick={cancelEdit} disabled={saving}
                  class="px-3 py-1.5 text-sm text-white/40 hover:text-white active:text-white/60 focus-visible:outline-none rounded disabled:opacity-40"
                >Cancel</button>
                <button
                  onclick={saveEdit} disabled={saving}
                  class="px-3 py-1.5 bg-white text-neutral-950 rounded text-sm font-medium hover:bg-white/90 active:bg-white/75 focus-visible:outline-none disabled:opacity-40"
                >{saving ? 'Saving…' : 'Save'}</button>
              </div>
            </div>
          {:else}
            <div class="flex items-center justify-between px-4 py-3 gap-3">
              <div class="min-w-0 flex-1">
                <div class="flex items-center gap-2">
                  <p class="text-sm font-medium text-white truncate">{t.title}</p>
                  {#if t.tag}
                    <span class="px-1.5 py-0.5 rounded text-xs font-medium bg-white/10 text-white/60 border border-white/10">{t.tag}</span>
                  {/if}
                </div>
                <p class="text-xs text-white/40">{t.exercises.length} exercise{t.exercises.length !== 1 ? 's' : ''}</p>
              </div>
              <div class="flex gap-2 shrink-0">
                {#if confirmDeleteId === t.id}
                  <button
                    onclick={() => deleteTemplate(t.id)}
                    class="px-3 py-1.5 bg-red-500/15 border border-red-500/25 text-red-400 rounded text-xs font-medium hover:bg-red-500/25 active:bg-red-500/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500/30"
                  >Confirm delete</button>
                  <button
                    onclick={() => confirmDeleteId = null}
                    class="px-3 py-1.5 text-white/40 hover:text-white active:text-white/60 focus-visible:outline-none text-xs rounded"
                  >Cancel</button>
                {:else}
                  <a
                    href="/workouts/new?template={t.id}"
                    class="px-3 py-1.5 bg-white text-neutral-950 rounded text-xs font-medium hover:bg-white/90 active:bg-white/75 focus-visible:outline-none"
                  >Use</a>
                  <button
                    onclick={() => startEdit(t)}
                    class="px-2 py-1.5 text-white/40 hover:text-white active:text-white/60 focus-visible:outline-none text-xs rounded"
                  >Edit</button>
                  <button
                    onclick={() => confirmDeleteId = t.id}
                    class="px-2 py-1.5 text-white/30 hover:text-red-400 active:text-red-500 focus-visible:outline-none text-xs rounded"
                  >Delete</button>
                {/if}
              </div>
            </div>
          {/if}
        {/each}
      </div>
    {/if}

  </div>
</div>
