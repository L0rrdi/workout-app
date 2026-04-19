// src/routes/api/workouts/bulk/+server.ts
import { json } from '@sveltejs/kit';
import type { RequestHandler } from '@sveltejs/kit';
import { getUser } from '$lib/auth';

// POST /api/workouts/bulk — insert multiple workouts at once
export const POST: RequestHandler = async ({ request, platform }) => {
  const db = platform?.env.DB;
  if (!db) return json({ error: 'Database not available' }, { status: 500 });

  const user = await getUser(request, db);
  if (!user) return json({ error: 'Unauthorized' }, { status: 401 });

  const workouts = await request.json();

  for (const workout of workouts) {
    await db.prepare('INSERT INTO workouts (id, title, date, tag, user_id) VALUES (?, ?, ?, ?, ?)')
      .bind(workout.id, workout.title, workout.date, workout.tag ?? null, user.id)
      .run();

    for (let i = 0; i < workout.exercises.length; i++) {
      const e = workout.exercises[i];
      const eid = `${workout.id}_${i}_${Math.random().toString(36).slice(2)}`;
      const raw = e.raw || `${e.name} ${e.sets}x${e.reps}${e.weight != null ? ' ' + e.weight + (e.unit ?? '') : ''}`;
      await db.prepare(
        'INSERT INTO exercises (id, workout_id, name, sets, reps, weight, unit, raw, set_data) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
      ).bind(eid, workout.id, e.name, e.sets, e.reps, e.weight ?? null, e.unit ?? null, raw, e.set_data ?? null).run();
    }
  }

  return json({ success: true, count: workouts.length });
};
