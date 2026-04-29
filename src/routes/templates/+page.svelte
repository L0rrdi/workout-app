<!-- src/routes/templates/+page.svelte -->
<script lang="ts">
  import { onMount } from 'svelte';

  type TemplateExercise = { name: string; sets: number; reps: number | null; weight: number | null; unit: string | null };
  type Template = { id: string; title: string; tag: string | null; exercises: TemplateExercise[] };

  let templates = $state<Template[]>([]);
  let loading = $state(true);
  let confirmDeleteId = $state<string | null>(null);

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
                <button
                  onclick={() => confirmDeleteId = t.id}
                  class="px-2 py-1.5 text-white/30 hover:text-red-400 active:text-red-500 focus-visible:outline-none text-xs rounded"
                >Delete</button>
              {/if}
            </div>
          </div>
        {/each}
      </div>
    {/if}

  </div>
</div>
