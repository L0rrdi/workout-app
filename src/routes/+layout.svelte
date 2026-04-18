<script lang="ts">
	import './layout.css';
	import favicon from '$lib/assets/favicon.svg';
	import { page } from '$app/state';
	import type { LayoutData } from './$types';

	let { children, data }: { children: any; data: LayoutData } = $props();

	let path = $derived(page.url.pathname);
	let user = $derived(data.user);
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
		{#if user}
			<div class="flex items-center gap-3 pl-2 border-l border-white/10">
				<span class="text-xs text-white/40">{user.name.split(' ')[0]}</span>
				<a
					href="/auth/logout"
					class="text-xs text-white/30 hover:text-white/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30 rounded active:text-white/50"
				>
					Sign out
				</a>
			</div>
		{/if}
	</div>
</nav>
{/if}

<div class="{showNav ? 'pt-14' : ''} page-fade">
	{@render children()}
</div>
