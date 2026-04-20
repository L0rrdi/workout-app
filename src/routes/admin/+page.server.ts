import type { PageServerLoad } from './$types';
import { redirect, error } from '@sveltejs/kit';
import { getUser } from '$lib/auth';

export const load: PageServerLoad = async ({ request, platform }) => {
  const db = platform?.env.DB;
  if (!db) throw error(500, 'Database unavailable');

  const user = await getUser(request, db);
  const adminEmail = platform?.env.ADMIN_EMAIL ?? '';
  if (!user || user.email !== adminEmail) throw redirect(302, '/');

  const [userCount, workoutCount, exerciseCount, allUsers, recentActivity, topExercises] = await Promise.all([
    db.prepare('SELECT COUNT(*) as count FROM users').first<{ count: number }>(),
    db.prepare('SELECT COUNT(*) as count FROM workouts').first<{ count: number }>(),
    db.prepare('SELECT COUNT(*) as count FROM exercises').first<{ count: number }>(),
    db.prepare(`
      SELECT u.id, u.name, u.email, u.picture, u.created_at,
             COUNT(w.id) as workout_count
      FROM users u
      LEFT JOIN workouts w ON w.user_id = u.id
      GROUP BY u.id
      ORDER BY u.created_at DESC
    `).all<{
      id: string;
      name: string;
      email: string;
      picture: string | null;
      created_at: string;
      workout_count: number;
    }>(),
    db.prepare(`
      SELECT w.id, w.title, w.date, u.name as user_name, u.picture as user_picture,
             COUNT(e.id) as exercise_count
      FROM workouts w
      JOIN users u ON u.id = w.user_id
      LEFT JOIN exercises e ON e.workout_id = w.id
      GROUP BY w.id
      ORDER BY w.date DESC, w.id DESC
      LIMIT 30
    `).all<{
      id: string;
      title: string;
      date: string;
      user_name: string;
      user_picture: string | null;
      exercise_count: number;
    }>(),
    db.prepare(`
      SELECT LOWER(name) as name, COUNT(*) as count
      FROM exercises
      GROUP BY LOWER(name)
      ORDER BY count DESC
      LIMIT 10
    `).all<{ name: string; count: number }>(),
  ]);

  return {
    stats: {
      users: userCount?.count ?? 0,
      workouts: workoutCount?.count ?? 0,
      exercises: exerciseCount?.count ?? 0,
    },
    users: allUsers.results,
    recentActivity: recentActivity.results,
    topExercises: topExercises.results,
  };
};
