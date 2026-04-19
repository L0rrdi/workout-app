import { json, error } from '@sveltejs/kit';
import { getUser, ADMIN_EMAIL } from '$lib/auth';
import type { RequestHandler } from './$types';

export const DELETE: RequestHandler = async ({ request, platform, params }) => {
  const db = platform?.env.DB;
  if (!db) throw error(500, 'Database unavailable');

  const admin = await getUser(request, db);
  if (!admin || admin.email !== ADMIN_EMAIL) throw error(403, 'Forbidden');
  if (admin.id === params.id) throw error(400, 'Cannot delete your own account');

  await db.prepare(`
    DELETE FROM exercises WHERE workout_id IN (SELECT id FROM workouts WHERE user_id = ?)
  `).bind(params.id).run();

  await db.prepare('DELETE FROM workouts WHERE user_id = ?').bind(params.id).run();
  await db.prepare('DELETE FROM templates WHERE user_id = ?').bind(params.id).run();
  await db.prepare('DELETE FROM sessions WHERE user_id = ?').bind(params.id).run();
  await db.prepare('DELETE FROM api_tokens WHERE user_id = ?').bind(params.id).run();
  await db.prepare('DELETE FROM users WHERE id = ?').bind(params.id).run();

  return json({ ok: true });
};
