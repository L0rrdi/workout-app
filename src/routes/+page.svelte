<script lang="ts">
</script>

<svelte:head>
	<title>Workout App</title>
	<meta
		name="description"
		content="Track workouts and convert workout notes into structured data."
	/>
</svelte:head>

<div class="min-h-screen bg-neutral-950 text-white">
	<div class="mx-auto flex min-h-screen max-w-4xl flex-col justify-center px-6 py-16">
		<div class="mb-6 inline-flex w-fit rounded-full border border-white/10 bg-white/5 px-3 py-1 text-sm text-white/70">
			V1 in progress
		</div>

		<h1 class="max-w-3xl text-4xl font-bold tracking-tight sm:text-6xl">
			Workout tracking with text import
		</h1>

		<p class="mt-6 max-w-2xl text-lg leading-8 text-white/70">
			Build workouts manually or paste workout notes and turn them into usable workout data.
		</p>

		<div class="mt-10 flex flex-wrap gap-4">
			<a
				href="/import"
				class="rounded-xl bg-white px-5 py-3 font-medium text-black transition hover:opacity-90"
			>
				Try text import
			</a>

			<a
				href="/workouts"
				class="rounded-xl border border-white/15 px-5 py-3 font-medium text-white transition hover:bg-white/5"
			>
				View workouts
			</a>
		</div>
	</div>
</div>