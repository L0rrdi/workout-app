<script lang="ts">
	import type { PageData } from './$types';
	let { data }: { data: PageData } = $props();
	let u = $derived(data.targetUser);

	let confirming = $state(false);
	let deleting = $state(false);
	let deleteError = $state('');

	async function deleteUser() {
		deleting = true;
		deleteError = '';
		try {
			const res = await fetch(`/api/admin/users/${u.id}`, { method: 'DELETE' });
			if (!res.ok) throw new Error();
			window.location.href = '/admin';
		} catch {
			deleteError = 'Something went wrong. Try again.';
			deleting = false;
			confirming = false;
		}
	}
</script>

<div class="min-h-screen bg-neutral-950 text-white">
<div class="max-w-2xl mx-auto px-4 py-10">
	<!-- Back -->
	<a
		href="/admin"
		class="inline-flex items-center gap-1.5 text-sm text-white/40 hover:text-white/70 active:text-white/50 mb-8 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/20 rounded"
	>
		<svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7"/></svg>
		Console
	</a>

	<!-- User profile -->
	<div class="bg-white/5 border border-white/10 rounded-lg p-5 flex items-center gap-4 mb-8">
		{#if u.picture}
			<img src={u.picture} alt={u.name} referrerpolicy="no-referrer" class="w-12 h-12 rounded-full ring-1 ring-white/10 shrink-0" />
		{:else}
			<div class="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center text-lg font-medium text-white/60 shrink-0">
				{u.name[0]}
			</div>
		{/if}
		<div class="flex-1 min-w-0">
			<p class="text-base font-medium text-white truncate">{u.name}</p>
			<p class="text-sm text-white/40 truncate">{u.email}</p>
		</div>
		<div class="text-right shrink-0">
			<p class="text-2xl font-semibold text-white tabular-nums">{data.workouts.length}</p>
			<p class="text-xs text-white/40">workout{data.workouts.length === 1 ? '' : 's'}</p>
		</div>
	</div>

	<!-- Joined + delete -->
	<div class="flex items-center justify-between mb-6">
		<p class="text-xs text-white/30">
			Joined {new Date(u.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
		</p>

		{#if confirming}
			<div class="flex items-center gap-2">
				<span class="text-xs text-red-400">Delete this user?</span>
				<button
					onclick={deleteUser}
					disabled={deleting}
					class="px-3 py-1.5 bg-red-500 text-white rounded-md text-xs font-medium hover:bg-red-400 active:bg-red-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400 disabled:opacity-40 disabled:cursor-not-allowed"
				>
					{deleting ? 'Deleting…' : 'Confirm'}
				</button>
				<button
					onclick={() => confirming = false}
					class="px-3 py-1.5 bg-white/5 border border-white/10 text-white/70 rounded-md text-xs hover:bg-white/10 hover:text-white active:bg-white/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/20"
				>
					Cancel
				</button>
			</div>
		{:else}
			<button
				onclick={() => confirming = true}
				class="px-3 py-1.5 bg-white/5 border border-red-500/20 text-red-400 rounded-md text-xs hover:bg-red-500/10 active:bg-red-500/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400/40"
			>
				Delete user
			</button>
		{/if}
	</div>

	{#if deleteError}
		<p class="text-sm text-red-400 mb-4">{deleteError}</p>
	{/if}

	<!-- Workouts list -->
	<div>
		<p class="text-xs font-medium text-white/40 uppercase tracking-wide mb-3">Workouts</p>
		{#if data.workouts.length === 0}
			<div class="bg-white/5 border border-white/10 rounded-lg px-4 py-8 text-center text-sm text-white/30">
				No workouts logged yet
			</div>
		{:else}
			<div class="bg-white/5 border border-white/10 rounded-lg divide-y divide-white/5">
				{#each data.workouts as w (w.id)}
					<a
						href="/workouts/{w.id}"
						class="flex items-center gap-3 px-4 py-3 hover:bg-white/5 active:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/20"
					>
						<div class="flex-1 min-w-0">
							<p class="text-sm text-white truncate">{w.title}</p>
							<p class="text-xs text-white/40">{w.exercise_count} exercise{w.exercise_count === 1 ? '' : 's'}{w.notes ? ' · has notes' : ''}</p>
						</div>
						<span class="text-xs text-white/30 shrink-0">{w.date}</span>
					</a>
				{/each}
			</div>
		{/if}
	</div>
</div>
</div>
