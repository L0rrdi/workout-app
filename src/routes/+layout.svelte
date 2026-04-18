<script lang="ts">
	import './layout.css';
	import favicon from '$lib/assets/favicon.svg';
	import { page } from '$app/state';

	let { children } = $props();

	let path = $derived(page.url.pathname);
</script>

<svelte:head><link rel="icon" href={favicon} /></svelte:head>

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
	</div>
</nav>

<div class="pt-14 page-fade">
	{@render children()}
</div>
