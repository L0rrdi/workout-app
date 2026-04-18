// src/routes/api/workouts/[id]/+server.ts
import { json } from '@sveltejs/kit';
import type { RequestHandler } from '@sveltejs/kit';

// PUT /api/workouts/:id — update a workout's title, date, and exercises
export const PUT: RequestHandler = async ({ params, request, platform }) => {
  const db = platform?.env.DB;
  if (!db) return json({ error: 'Database not available' }, { status: 500 });

  const { id } = params;
  const { title, date, exercises } = await request.json();

  await db.prepare('UPDATE workouts SET title = ?, date = ? WHERE id = ?').bind(title, date, id).run();
  await db.prepare('DELETE FROM exercises WHERE workout_id = ?').bind(id).run();

  for (const e of exercises) {
    const eid = `${id}_${e.name}_${Date.now()}_${Math.random()}`;
    await db.prepare(
      'INSERT INTO exercises (id, workout_id, name, sets, reps, weight, unit, raw) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
    ).bind(eid, id, e.name, e.sets, e.reps, e.weight ?? null, e.unit ?? null, e.raw).run();
  }

  return json({ success: true });
};

// DELETE /api/workouts/:id — delete a workout and its exercises
export const DELETE: RequestHandler = async ({ params, platform }) => {
  const db = platform?.env.DB;
  if (!db) return json({ error: 'Database not available' }, { status: 500 });

  const { id } = params;

  await db.prepare('DELETE FROM workouts WHERE id = ?').bind(id).run();

  return json({ success: true });
};