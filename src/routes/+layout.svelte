<script lang="ts">
	import './layout.css';
	import favicon from '$lib/assets/favicon.svg';
	import { page } from '$app/state';
	import type { LayoutData } from './$types';

	let { children, data }: { children: any; data: LayoutData } = $props();

	let path = $derived(page.url.pathname);
	let user = $derived(data.user);
	let isAdmin = $derived(user?.email === 'nosviland@gmail.com');
	let showNav = $derived(!path.startsWith('/login'));
</script>

<svelte:head><link rel="icon" href={favicon} /></svelte:head>

{#if showNav}
<nav class="fixed top-0 inset-x-0 z-50 h-14 bg-neutral-950 border-b border-white/10 flex items-center px-6">
	<a
		href="/"
		class="text-white font-semibold tracking-tight text-sm mr-auto hover:text-white/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30 rounded active:text-white/60"
	>
		Workout App
	</a>
	<div class="flex items-center gap-6">
		<a
			href="/workouts"
			class="text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30 rounded active:text-white/50
				{path.startsWith('/workouts') ? 'text-white font-medium' : 'text-white/50 hover:text-white'}"
		>
			Workouts
		</a>
		<a
			href="/progress"
			class="text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30 rounded active:text-white/50
				{path.startsWith('/progress') ? 'text-white font-medium' : 'text-white/50 hover:text-white'}"
		>
			Progress
		</a>
		<a
			href="/import"
			class="text-sm font-medium px-3 py-1.5 rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50
				{path === '/import' ? 'bg-white text-neutral-950' : 'bg-white/10 text-white hover:bg-white hover:text-neutral-950 active:bg-white/75'}"
		>
			Import
		</a>
		<a
			href="/workouts/new"
			class="text-sm font-medium px-3 py-1.5 rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50
				{path === '/workouts/new' ? 'bg-white text-neutral-950' : 'bg-white/10 text-white hover:bg-white hover:text-neutral-950 active:bg-white/75'}"
		>
			+ Add
		</a>
		{#if user}
			<div class="relative group pl-2 border-l border-white/10">
				<!-- Avatar -->
				<button class="flex items-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30 rounded">
					{#if user.picture}
						<img
							src={user.picture}
							alt={user.name}
							referrerpolicy="no-referrer"
							class="w-7 h-7 rounded-full ring-1 ring-white/10 group-hover:ring-white/30"
						/>
					{:else}
						<div class="w-7 h-7 rounded-full bg-white/10 flex items-center justify-center text-xs font-medium text-white/60 group-hover:bg-white/20">
							{user.name[0]}
						</div>
					{/if}
				</button>

				<!-- Dropdown — pt-2 bridges the gap so hover doesn't break -->
				<div class="absolute right-0 top-full pt-2 opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto transition duration-150 -translate-y-1 group-hover:translate-y-0 z-50">
					<div class="w-36 rounded-md bg-neutral-900 border border-white/10 py-1 shadow-xl">
						<a
							href="/profile"
							class="block px-3 py-2 text-sm text-white/70 hover:text-white hover:bg-white/5 active:bg-white/10"
						>
							Profile
						</a>
						<a
							href="/records"
							class="block px-3 py-2 text-sm text-white/70 hover:text-white hover:bg-white/5 active:bg-white/10"
						>
							Records
						</a>
						<a
							href="/settings"
							class="block px-3 py-2 text-sm text-white/70 hover:text-white hover:bg-white/5 active:bg-white/10"
						>
							Settings
						</a>
						{#if isAdmin}
							<div class="my-1 border-t border-white/10"></div>
							<a
								href="/admin"
								class="block px-3 py-2 text-sm text-red-400 hover:text-red-300 hover:bg-white/5 active:bg-white/10"
							>
								Console
							</a>
						{/if}
					</div>
				</div>
			</div>
		{/if}
	</div>
</nav>
{/if}

<div class="{showNav ? 'pt-14' : ''} page-fade">
	{@render children()}
</div>
