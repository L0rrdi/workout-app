// src/routes/api/workouts/+server.ts
import { json } from '@sveltejs/kit';
import type { RequestHandler } from '@sveltejs/kit';

// GET /api/workouts � load all workouts with their exercises
export const GET: RequestHandler = async ({ platform }) => {
  const db = platform?.env.DB;
  if (!db) return json({ error: 'Database not available' }, { status: 500 });

  const [workouts, exercises] = await Promise.all([
    db.prepare('SELECT * FROM workouts ORDER BY date DESC').all(),
    db.prepare('SELECT * FROM exercises').all()
  ]);

  const exercisesByWorkout = new Map<string, unknown[]>();
  for (const e of exercises.results as Record<string, unknown>[]) {
    const wid = e.workout_id as string;
    if (!exercisesByWorkout.has(wid)) exercisesByWorkout.set(wid, []);
    exercisesByWorkout.get(wid)!.push(e);
  }

  const result = (workouts.results as Record<string, unknown>[]).map(w => ({
    ...w,
    exercises: exercisesByWorkout.get(w.id as string) ?? []
  }));

  return json(result);
};

// POST /api/workouts � save a new workout
export const POST: RequestHandler = async ({ request, platform }) => {
  const db = platform?.env.DB;
  if (!db) return json({ error: 'Database not available' }, { status: 500 });

  const body = await request.json();
  const { id, title, date, exercises } = body;

  await db.prepare('INSERT INTO workouts (id, title, date) VALUES (?, ?, ?)')
    .bind(id, title, date)
    .run();

  for (const exercise of exercises) {
    await db
      .prepare(
        'INSERT INTO exercises (id, workout_id, name, sets, reps, weight, unit, raw) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
      )
      .bind(
        crypto.randomUUID(),
        id,
        exercise.name,
        exercise.sets,
        exercise.reps,
        exercise.weight,
        exercise.unit,
        exercise.raw
      )
      .run();
  }

  return json({ success: true });
};
