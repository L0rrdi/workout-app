<script lang="ts">
	import { parseWorkoutText, type ParsedWorkout } from '$lib/server/import/parser';

	let workoutText = `Push Day
Bench Press 3x8 60kg
Incline Dumbbell Press 3x10 22.5kg
Lateral Raise 4x15 10kg
Tricep Pushdown 3x12 30kg`;

	let parsedWorkout: ParsedWorkout | null = null;

	function handleParse() {
		parsedWorkout = parseWorkoutText(workoutText);
	}
</script>

<svelte:head>
	<title>Import Workout Text</title>
</svelte:head>

<div class="min-h-screen bg-neutral-950 text-white">
	<div class="mx-auto max-w-5xl px-6 py-16">
		<h1 class="text-3xl font-bold">Import workout text</h1>
		<p class="mt-3 text-white/70">
			Paste workout notes here and preview the structured workout data.
		</p>

		<div class="mt-8 grid gap-8 lg:grid-cols-2">
			<div>
				<label for="workoutText" class="mb-3 block text-sm font-medium text-white/80">
					Workout text
				</label>

				<textarea
					id="workoutText"
					bind:value={workoutText}
					class="min-h-[320px] w-full rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-white outline-none"
				/>

				<button
					on:click={handleParse}
					class="mt-4 rounded-xl bg-white px-5 py-3 font-medium text-black transition hover:opacity-90"
				>
					Parse workout text
				</button>
			</div>

			<div class="rounded-2xl border border-white/10 bg-white/5 p-5">
				<h2 class="text-xl font-semibold">Parsed preview</h2>

				{#if parsedWorkout}
					<div class="mt-4">
						<p class="text-sm uppercase tracking-wide text-white/50">Workout title</p>
						<h3 class="mt-1 text-2xl font-bold">{parsedWorkout.title}</h3>
					</div>

					<div class="mt-6">
						<p class="text-sm uppercase tracking-wide text-white/50">Exercises</p>

						{#if parsedWorkout.exercises.length > 0}
							<div class="mt-3 space-y-3">
								{#each parsedWorkout.exercises as exercise}
									<div class="rounded-xl border border-white/10 bg-black/20 p-4">
										<h4 class="text-lg font-semibold">{exercise.name || 'Unnamed exercise'}</h4>

										<div class="mt-2 flex flex-wrap gap-2 text-sm text-white/70">
											<span class="rounded-full border border-white/10 px-3 py-1">
												Sets: {exercise.sets ?? '-'}
											</span>
											<span class="rounded-full border border-white/10 px-3 py-1">
												Reps: {exercise.reps ?? '-'}
											</span>
											<span class="rounded-full border border-white/10 px-3 py-1">
												Weight: {exercise.weight ?? '-'} {exercise.weight ? exercise.unit : ''}
											</span>
										</div>
									</div>
								{/each}
							</div>
						{:else}
							<p class="mt-3 text-white/60">No exercises found.</p>
						{/if}
					</div>
				{:else}
					<p class="mt-4 text-white/60">
						Click “Parse workout text” to see the structured result here.
					</p>
				{/if}
			</div>
		</div>
	</div>
</div>

