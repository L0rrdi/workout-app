<script lang="ts">
	import type { PageData } from './$types';
	let { data }: { data: PageData } = $props();
</script>

<div class="min-h-screen bg-neutral-950 text-white">
<div class="max-w-2xl mx-auto px-4 py-10">
	<div class="mb-8 flex items-center gap-3">
		<h1 class="text-2xl font-semibold tracking-tight text-white">Console</h1>
		<span class="text-xs font-medium px-2 py-0.5 rounded-full bg-red-500/20 text-red-400 border border-red-500/30">Admin</span>
	</div>

	<!-- Stats -->
	<div class="grid grid-cols-3 gap-3 mb-8">
		<div class="bg-white/5 border border-white/10 rounded-lg p-4 flex flex-col gap-1">
			<span class="text-xs font-medium text-white/40 uppercase tracking-wide">Users</span>
			<span class="text-3xl font-semibold text-white">{data.stats.users}</span>
		</div>
		<div class="bg-white/5 border border-white/10 rounded-lg p-4 flex flex-col gap-1">
			<span class="text-xs font-medium text-white/40 uppercase tracking-wide">Workouts</span>
			<span class="text-3xl font-semibold text-white">{data.stats.workouts}</span>
		</div>
		<div class="bg-white/5 border border-white/10 rounded-lg p-4 flex flex-col gap-1">
			<span class="text-xs font-medium text-white/40 uppercase tracking-wide">Exercises</span>
			<span class="text-3xl font-semibold text-white">{data.stats.exercises}</span>
		</div>
	</div>

	<!-- Top exercises -->
	<div class="mb-8">
		<p class="text-xs font-medium text-white/40 uppercase tracking-wide mb-3">Top exercises</p>
		{#if data.topExercises.length === 0}
			<div class="bg-white/5 border border-white/10 rounded-lg px-4 py-8 text-center text-sm text-white/30">No exercises yet</div>
		{:else}
			{@const max = data.topExercises[0].count}
			<div class="bg-white/5 border border-white/10 rounded-lg divide-y divide-white/5">
				{#each data.topExercises as ex, i (ex.name)}
					<div class="flex items-center gap-3 px-4 py-3">
						<span class="text-xs font-medium text-white/30 w-4 text-right tabular-nums shrink-0">{i + 1}</span>
						<div class="flex-1 min-w-0">
							<p class="text-sm text-white capitalize truncate">{ex.name}</p>
							<div class="mt-1 h-1 rounded-full bg-white/10 overflow-hidden">
								<div class="h-full rounded-full bg-white/40" style="width: {Math.round((ex.count / max) * 100)}%"></div>
							</div>
						</div>
						<span class="text-sm text-white/70 tabular-nums shrink-0">{ex.count}</span>
					</div>
				{/each}
			</div>
		{/if}
	</div>

	<!-- Users table -->
	<div>
		<p class="text-xs font-medium text-white/40 uppercase tracking-wide mb-3">All users</p>
		<div class="bg-white/5 border border-white/10 rounded-lg overflow-hidden">
			<!-- Header -->
			<div class="grid grid-cols-[auto_1fr_auto] sm:grid-cols-[auto_1fr_auto_auto] items-center gap-4 px-4 py-2 border-b border-white/10">
				<div class="w-7"></div>
				<span class="text-xs font-medium text-white/40 uppercase tracking-wide">User</span>
				<span class="text-xs font-medium text-white/40 uppercase tracking-wide text-right">Workouts</span>
				<span class="hidden sm:block text-xs font-medium text-white/40 uppercase tracking-wide text-right">Joined</span>
			</div>
			<!-- Rows -->
			<div class="divide-y divide-white/5">
				{#each data.users as u (u.id)}
					<a href="/admin/users/{u.id}" class="grid grid-cols-[auto_1fr_auto] sm:grid-cols-[auto_1fr_auto_auto] items-center gap-4 px-4 py-3 hover:bg-white/5 active:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/20">
						{#if u.picture}
							<img src={u.picture} alt={u.name} referrerpolicy="no-referrer" class="w-7 h-7 rounded-full ring-1 ring-white/10 shrink-0" />
						{:else}
							<div class="w-7 h-7 rounded-full bg-white/10 flex items-center justify-center text-xs font-medium text-white/60 shrink-0">
								{u.name[0]}
							</div>
						{/if}
						<div class="min-w-0">
							<p class="text-sm text-white truncate">{u.name}</p>
							<p class="text-xs text-white/40 truncate">{u.email}</p>
						</div>
						<span class="text-sm text-white/70 text-right tabular-nums">{u.workout_count}</span>
						<span class="hidden sm:block text-xs text-white/30 text-right">{new Date(u.created_at).toLocaleDateString()}</span>
					</a>
				{:else}
					<div class="px-4 py-8 text-center text-sm text-white/30">No users yet</div>
				{/each}
			</div>
		</div>
	</div>

	<!-- Activity feed -->
	<div class="mt-8">
		<p class="text-xs font-medium text-white/40 uppercase tracking-wide mb-3">Recent activity</p>
		<div class="bg-white/5 border border-white/10 rounded-lg divide-y divide-white/5">
			{#each data.recentActivity as w (w.id)}
				<a
					href="/workouts/{w.id}"
					class="flex items-center gap-3 px-4 py-3 hover:bg-white/5 active:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/20"
				>
					{#if w.user_picture}
						<img src={w.user_picture} alt={w.user_name} referrerpolicy="no-referrer" class="w-7 h-7 rounded-full ring-1 ring-white/10 shrink-0" />
					{:else}
						<div class="w-7 h-7 rounded-full bg-white/10 flex items-center justify-center text-xs font-medium text-white/60 shrink-0">
							{w.user_name[0]}
						</div>
					{/if}
					<div class="flex-1 min-w-0">
						<p class="text-sm text-white truncate">{w.title}</p>
						<p class="text-xs text-white/40">{w.user_name} &middot; {w.exercise_count} exercise{w.exercise_count === 1 ? '' : 's'}</p>
					</div>
					<span class="text-xs text-white/30 shrink-0">{w.date}</span>
				</a>
			{:else}
				<div class="px-4 py-8 text-center text-sm text-white/30">No workouts yet</div>
			{/each}
		</div>
	</div>
</div>
</div>
