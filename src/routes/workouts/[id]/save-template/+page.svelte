<!-- src/routes/workouts/[id]/save-template/+page.svelte -->
<script lang="ts">
  import type { PageData } from './$types';

  let { data }: { data: PageData } = $props();

  let newTitle = $state(data.workout.title);
  let saving = $state(false);
  let errorMsg = $state('');
  let confirmId = $state<string | null>(null);

  async function saveAsNew() {
    saving = true;
    errorMsg = '';
    try {
      const res = await fetch('/api/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: newTitle.trim() || 'Template',
          exercises: data.exercises
        })
      });
      if (!res.ok) throw new Error();
      window.location.href = `/workouts/${data.workout.id}`;
    } catch {
      errorMsg = 'Could not save template.';
      saving = false;
    }
  }

  async function overwrite(templateId: string, title: string) {
    saving = true;
    errorMsg = '';
    try {
      const res = await fetch(`/api/templates?id=${templateId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, exercises: data.exercises })
      });
      if (!res.ok) throw new Error();
      window.location.href = `/workouts/${data.workout.id}`;
    } catch {
      errorMsg = 'Could not overwrite template.';
      saving = false;
      confirmId = null;
    }
  }
</script>

<svelte:head><title>Save as template</title></svelte:head>

<div class="min-h-screen bg-neutral-950 text-white">
  <div class="max-w-2xl mx-auto px-6 py-10 space-y-6">

    <a
      href="/workouts/{data.workout.id}"
      class="inline-flex items-center gap-1 text-sm text-white/40 hover:text-white active:text-white/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30 rounded"
    >
      ← Back
    </a>

    <div class="space-y-1">
      <h1 class="text-2xl font-semibold tracking-tight">Save as template</h1>
      <p class="text-sm text-white/50">{data.exercises.length} exercise{data.exercises.length !== 1 ? 's' : ''} from "{data.workout.title}"</p>
    </div>

    <!-- Save as new -->
    <div class="rounded-md bg-white/5 border border-white/10 p-4 space-y-3">
      <p class="text-xs font-medium text-white/40 uppercase tracking-wide">Save as new template</p>
      <input
        type="text" bind:value={newTitle}
        placeholder="Template name"
        class="w-full rounded bg-white/5 border border-white/10 px-3 py-2 text-sm text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-white/20"
      />
      <button
        onclick={saveAsNew} disabled={saving}
        class="w-full px-4 py-2 bg-white text-neutral-950 rounded text-sm font-medium hover:bg-white/90 active:bg-white/75 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50 disabled:opacity-40 disabled:cursor-not-allowed"
      >
        {saving ? 'Saving…' : 'Save as new template'}
      </button>
    </div>

    {#if data.templates.length > 0}
      <!-- Overwrite existing -->
      <div class="space-y-2">
        <p class="text-xs font-medium text-white/40 uppercase tracking-wide px-1">Or overwrite an existing template</p>
        <div class="rounded-md bg-white/5 border border-white/10 divide-y divide-white/5">
          {#each data.templates as t (t.id)}
            <div class="flex items-center justify-between px-4 py-3">
              <p class="text-sm font-medium text-white">{t.title}</p>
              {#if confirmId === t.id}
                <div class="flex gap-2">
                  <button
                    onclick={() => overwrite(t.id, t.title)} disabled={saving}
                    class="px-3 py-1.5 bg-red-500/15 border border-red-500/25 text-red-400 rounded text-xs font-medium hover:bg-red-500/25 active:bg-red-500/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500/30 disabled:opacity-40"
                  >Confirm overwrite</button>
                  <button
                    onclick={() => confirmId = null} disabled={saving}
                    class="px-3 py-1.5 text-white/40 hover:text-white active:text-white/60 focus-visible:outline-none text-xs rounded"
                  >Cancel</button>
                </div>
              {:else}
                <button
                  onclick={() => confirmId = t.id} disabled={saving}
                  class="px-3 py-1.5 bg-white/5 border border-white/10 text-white/60 rounded text-xs font-medium hover:bg-white/10 hover:text-white active:bg-white/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30 disabled:opacity-40"
                >Overwrite</button>
              {/if}
            </div>
          {/each}
        </div>
      </div>
    {/if}

    {#if errorMsg}
      <p class="text-sm text-red-400">{errorMsg}</p>
    {/if}

  </div>
</div>
