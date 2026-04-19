// src/routes/api/workouts/[id]/+server.ts
import { json } from '@sveltejs/kit';
import type { RequestHandler } from '@sveltejs/kit';
import { getUser, ADMIN_EMAIL } from '$lib/auth';

// GET /api/workouts/:id — fetch a single workout (admin can access any)
export const GET: RequestHandler = async ({ params, request, platform }) => {
  const db = platform?.env.DB;
  if (!db) return json({ error: 'Database not available' }, { status: 500 });

  const user = await getUser(request, db);
  if (!user) return json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = params;
  const isAdmin = user.email === ADMIN_EMAIL;

  const workout = isAdmin
    ? await db.prepare('SELECT * FROM workouts WHERE id = ?').bind(id).first<Record<string, unknown>>()
    : await db.prepare('SELECT * FROM workouts WHERE id = ? AND user_id = ?').bind(id, user.id).first<Record<string, unknown>>();

  if (!workout) return json({ error: 'Not found' }, { status: 404 });

  const exercises = await db.prepare('SELECT * FROM exercises WHERE workout_id = ?').bind(id).all();
  return json({ ...workout, exercises: exercises.results });
};

// PUT /api/workouts/:id — update a workout's title, date, and exercises
export const PUT: RequestHandler = async ({ params, request, platform }) => {
  const db = platform?.env.DB;
  if (!db) return json({ error: 'Database not available' }, { status: 500 });

  const user = await getUser(request, db);
  if (!user) return json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = params;

  const owns = await db.prepare('SELECT id FROM workouts WHERE id = ? AND user_id = ?')
    .bind(id, user.id).first();
  if (!owns) return json({ error: 'Not found' }, { status: 404 });

  const { title, date, notes, tag, exercises } = await request.json();

  await db.prepare('UPDATE workouts SET title = ?, date = ?, notes = ?, tag = ? WHERE id = ?').bind(title, date, notes ?? null, tag ?? null, id).run();
  await db.prepare('DELETE FROM exercises WHERE workout_id = ?').bind(id).run();

  for (const e of exercises) {
    const eid = `${id}_${e.name}_${Date.now()}_${Math.random()}`;
    await db.prepare(
      'INSERT INTO exercises (id, workout_id, name, sets, reps, weight, unit, raw, set_data) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
    ).bind(eid, id, e.name, e.sets, e.reps, e.weight ?? null, e.unit ?? null, e.raw, e.set_data ?? null).run();
  }

  return json({ success: true });
};

// DELETE /api/workouts/:id — delete a workout and its exercises
export const DELETE: RequestHandler = async ({ params, request, platform }) => {
  const db = platform?.env.DB;
  if (!db) return json({ error: 'Database not available' }, { status: 500 });

  const user = await getUser(request, db);
  if (!user) return json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = params;

  // Verify ownership before deleting
  const workout = await db.prepare('SELECT id FROM workouts WHERE id = ? AND user_id = ?')
    .bind(id, user.id).first<{ id: string }>();
  if (!workout) return json({ error: 'Not found' }, { status: 404 });

  await db.prepare('DELETE FROM exercises WHERE workout_id = ?').bind(id).run();
  await db.prepare('DELETE FROM workouts WHERE id = ?').bind(id).run();

  return json({ success: true });
};
