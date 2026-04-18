// src/routes/api/workouts/[id]/+server.ts
import { json } from '@sveltejs/kit';
import type { RequestHandler } from '@sveltejs/kit';

// DELETE /api/workouts/:id — delete a workout and its exercises
export const DELETE: RequestHandler = async ({ params, platform }) => {
  const db = platform?.env.DB;
  if (!db) return json({ error: 'Database not available' }, { status: 500 });

  const { id } = params;

  await db.prepare('DELETE FROM workouts WHERE id = ?').bind(id).run();

  return json({ success: true });
};