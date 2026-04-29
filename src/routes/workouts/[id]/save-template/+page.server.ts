import type { PageServerLoad } from './$types';
import { error } from '@sveltejs/kit';
import { getUser } from '$lib/auth';

export const load: PageServerLoad = async ({ request, platform, params }) => {
  const db = platform?.env.DB;
  if (!db) throw error(500, 'Database unavailable');

  const user = await getUser(request, db);
  if (!user) throw error(401, 'Unauthorized');

  const workout = await db.prepare('SELECT id, title FROM workouts WHERE id = ? AND user_id = ?')
    .bind(params.id, user.id)
    .first<{ id: string; title: string }>();
  if (!workout) throw error(404, 'Workout not found');

  const exercises = await db.prepare(
    'SELECT name, sets, reps, weight, unit FROM exercises WHERE workout_id = ?'
  ).bind(params.id).all<{ name: string; sets: number; reps: number; weight: number | null; unit: string | null }>();

  const templates = await db.prepare(
    'SELECT id, title FROM templates WHERE user_id = ? ORDER BY created_at DESC'
  ).bind(user.id).all<{ id: string; title: string }>();

  return {
    workout,
    exercises: exercises.results,
    templates: templates.results
  };
};
