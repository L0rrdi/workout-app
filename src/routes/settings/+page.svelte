<!-- src/routes/settings/+page.svelte -->
<script lang="ts">
  let confirming = $state(false);
  let deleting = $state(false);
  let error = $state('');

  async function deleteAll() {
    deleting = true;
    error = '';
    try {
      const res = await fetch('/api/workouts', { method: 'DELETE' });
      if (!res.ok) throw new Error();
      window.location.href = '/workouts';
    } catch {
      error = 'Something went wrong. Try again.';
      deleting = false;
      confirming = false;
    }
  }
</script>

<svelte:head><title>Settings</title></svelte:head>

<div class="min-h-screen bg-neutral-950 text-white">
  <div class="max-w-2xl mx-auto px-6 py-10 space-y-6">

    <h1 class="text-2xl font-semibold tracking-tight">Settings</h1>

    <div class="rounded-md bg-white/5 border border-white/10 divide-y divide-white/5">

      <!-- Delete all workouts -->
      <div class="p-5 space-y-3">
        <div>
          <p class="text-sm font-medium text-white">Delete all workouts</p>
          <p class="text-xs text-white/40 mt-0.5">Permanently removes every workout and exercise from your account.</p>
        </div>

        {#if confirming}
          <div class="rounded-md bg-red-500/10 border border-red-500/20 p-4 space-y-3">
            <p class="text-sm text-red-300">Are you sure? This cannot be undone.</p>
            <div class="flex gap-2">
              <button
                onclick={deleteAll}
                disabled={deleting}
                class="px-3 py-1.5 bg-red-500 text-white rounded-md text-sm font-medium hover:bg-red-400 active:bg-red-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {deleting ? 'Deleting…' : 'Yes, delete everything'}
              </button>
              <button
                onclick={() => confirming = false}
                class="px-3 py-1.5 bg-white/5 border border-white/10 text-white/70 rounded-md text-sm hover:bg-white/10 hover:text-white active:bg-white/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/20"
              >
                Cancel
              </button>
            </div>
          </div>
        {:else}
          <button
            onclick={() => confirming = true}
            class="px-3 py-1.5 bg-white/5 border border-red-500/20 text-red-400 rounded-md text-sm hover:bg-red-500/10 active:bg-red-500/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400/40"
          >
            Delete all workouts
          </button>
        {/if}

        {#if error}
          <p class="text-sm text-red-400">{error}</p>
        {/if}
      </div>

    </div>

  </div>
</div>
