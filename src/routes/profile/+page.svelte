<!-- src/routes/profile/+page.svelte -->
<script lang="ts">
  import type { PageData } from './$types';

  let { data }: { data: PageData } = $props();

  let user = $derived(data.user);
  let isAdmin = $derived(data.isAdmin);

  const fmtDate = (d: string) =>
    new Date(d).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
</script>

<div class="min-h-screen bg-neutral-950 text-white">
  <div class="max-w-2xl mx-auto px-6 py-10 space-y-6">

    <h1 class="text-2xl font-semibold tracking-tight">Profile</h1>

    {#if user}
      <div class="rounded-md bg-white/5 border border-white/10 p-6 space-y-6">

        <!-- Avatar + name -->
        <div class="flex items-center gap-4">
          {#if user.picture}
            <img
              src={user.picture}
              alt={user.name}
              referrerpolicy="no-referrer"
              class="w-16 h-16 rounded-full ring-1 ring-white/10"
            />
          {:else}
            <div class="w-16 h-16 rounded-full bg-white/10 flex items-center justify-center text-xl font-semibold text-white/60">
              {user.name[0]}
            </div>
          {/if}

          <div>
            <div class="flex items-center gap-2">
              <span class="text-lg font-semibold">{user.name}</span>
              {#if isAdmin}
                <span class="px-1.5 py-0.5 rounded text-xs font-semibold bg-red-500/20 text-red-400 border border-red-500/30">
                  Admin
                </span>
              {/if}
            </div>
            <p class="text-sm text-white/50 mt-0.5">{user.email}</p>
          </div>
        </div>

        <!-- Details -->
        <div class="divide-y divide-white/5">
          <div class="flex items-center justify-between py-3">
            <span class="text-xs font-medium text-white/40 uppercase tracking-wide">Date joined</span>
            <span class="text-sm text-white/70">{fmtDate(user.created_at)}</span>
          </div>
          <div class="flex items-center justify-between py-3">
            <span class="text-xs font-medium text-white/40 uppercase tracking-wide">Account</span>
            <span class="text-sm text-white/70">Google</span>
          </div>
        </div>

        <!-- Sign out -->
        <a
          href="/auth/logout"
          class="inline-flex px-4 py-2 bg-white/5 border border-white/10 text-white/70 rounded-md text-sm hover:bg-white/10 hover:text-white active:bg-white/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/20"
        >
          Sign out
        </a>

      </div>
    {/if}

  </div>
</div>
