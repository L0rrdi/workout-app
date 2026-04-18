// src/routes/api/workouts/+server.ts
import { json } from '@sveltejs/kit';
import type { RequestHandler } from '@sveltejs/kit';

// GET /api/workouts � load all workouts with their exercises
export const GET: RequestHandler = async ({ platform }) => {
  const db = platform?.env.DB;
  if (!db) return json({ error: 'Database not available' }, { status: 500 });

  const workouts = await db.prepare('SELECT * FROM workouts ORDER BY date DESC').all();

  const result = await Promise.all(
    workouts.results.map(async (workout: Record<string, unknown>) => {
      const exercises = await db
        .prepare('SELECT * FROM exercises WHERE workout_id = ?')
        .bind(workout.id)
        .all();
      return { ...workout, exercises: exercises.results };
    })
  );

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
