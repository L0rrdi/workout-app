import type { PageServerLoad } from './$types';
import { redirect, error } from '@sveltejs/kit';
import { getUser, ADMIN_EMAIL } from '$lib/auth';

export const load: PageServerLoad = async ({ request, platform, params }) => {
  const db = platform?.env.DB;
  if (!db) throw error(500, 'Database unavailable');

  const admin = await getUser(request, db);
  if (!admin || admin.email !== ADMIN_EMAIL) throw redirect(302, '/');

  const [targetUser, workouts] = await Promise.all([
    db.prepare('SELECT id, name, email, picture, created_at FROM users WHERE id = ?')
      .bind(params.id)
      .first<{ id: string; name: string; email: string; picture: string | null; created_at: string }>(),
    db.prepare(`
      SELECT w.id, w.title, w.date, w.notes, COUNT(e.id) as exercise_count
      FROM workouts w
      LEFT JOIN exercises e ON e.workout_id = w.id
      WHERE w.user_id = ?
      GROUP BY w.id
      ORDER BY w.date DESC, w.id DESC
    `).bind(params.id).all<{
      id: string;
      title: string;
      date: string;
      notes: string | null;
      exercise_count: number;
    }>(),
  ]);

  if (!targetUser) throw error(404, 'User not found');

  return { targetUser, workouts: workouts.results };
};
