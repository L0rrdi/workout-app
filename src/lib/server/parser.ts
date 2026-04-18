export type ParsedExercise = {
	name: string;
	sets: number | null;
	reps: number | null;
	weight: number | null;
	unit: string | null;
};

export type ParsedWorkout = {
	title: string;
	exercises: ParsedExercise[];
	rawText: string;
};

function parseExerciseLine(line: string): ParsedExercise {
	const cleaned = line.trim();

	const setsRepsMatch = cleaned.match(/(\d+)\s*x\s*(\d+)/i);
	const weightMatch = cleaned.match(/(\d+(?:\.\d+)?)\s*(kg|lbs)?/i);

	let name = cleaned;
	let sets: number | null = null;
	let reps: number | null = null;
	let weight: number | null = null;
	let unit: string | null = null;

	if (setsRepsMatch) {
		sets = Number(setsRepsMatch[1]);
		reps = Number(setsRepsMatch[2]);
		name = name.replace(setsRepsMatch[0], '').trim();
	}

	if (weightMatch) {
		weight = Number(weightMatch[1]);
		unit = weightMatch[2] ?? 'kg';
		name = name.replace(weightMatch[0], '').trim();
	}

	name = name.replace(/[-–@]/g, '').replace(/\s+/g, ' ').trim();

	return {
		name,
		sets,
		reps,
		weight,
		unit
	};
}

export function parseWorkoutText(input: string): ParsedWorkout {
	const lines = input
		.split('\n')
		.map((line) => line.trim())
		.filter(Boolean);

	if (lines.length === 0) {
		return {
			title: 'Untitled Workout',
			exercises: [],
			rawText: input
		};
	}

	const [firstLine, ...exerciseLines] = lines;

	const exercises = exerciseLines
		.map(parseExerciseLine)
		.filter((exercise) => exercise.name.length > 0);

	return {
		title: firstLine,
		exercises,
		rawText: input
	};
}