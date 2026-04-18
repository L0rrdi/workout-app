<svelte:head>
	<title>Workouts</title>
</svelte:head>

<script lang="ts">
	const sampleWorkouts = [
		{ name: 'Push Day', date: '2026-04-10', exercises: 4 },
		{ name: 'Pull Day', date: '2026-04-12', exercises: 5 },
		{ name: 'Leg Day', date: '2026-04-14', exercises: 4 }
	];
</script>

<div class="min-h-screen bg-neutral-950 text-white">
	<div class="mx-auto max-w-4xl px-6 py-16">
		<h1 class="text-3xl font-bold">Workouts</h1>
		<p class="mt-3 text-white/70">Your saved workouts will show here.</p>

		<div class="mt-8 space-y-4">
			{#each sampleWorkouts as workout}
				<div class="rounded-2xl border border-white/10 bg-white/5 p-5">
					<div class="flex items-start justify-between gap-4">
						<div>
							<h2 class="text-xl font-semibold">{workout.name}</h2>
							<p class="mt-1 text-white/60">{workout.date}</p>
						</div>

						<div class="rounded-full border border-white/10 px-3 py-1 text-sm text-white/70">
							{workout.exercises} exercises
						</div>
					</div>
				</div>
			{/each}
		</div>
	</div>
</div>