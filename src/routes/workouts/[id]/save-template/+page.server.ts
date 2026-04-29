import type { PageServerLoad } from './$types';
import { error } from '@sveltejs/kit';
import { getUser } from '$lib/auth';

export const load: PageServerLoad = async ({ request, platform, params }) => {
  const db = platform?.env.DB;
  if (!db) throw error(500, 'Database unavailable');

  const user = await getUser(request, db);
  if (!user) throw error(401, 'Unauthorized');

  const workout = await db.prepare('SELECT id, title, tag FROM workouts WHERE id = ? AND user_id = ?')
    .bind(params.id, user.id)
    .first<{ id: string; title: string; tag: string | null }>();
  if (!workout) throw error(404, 'Workout not found');

  const rows = await db.prepare(
    'SELECT name, sets, unit FROM exercises WHERE workout_id = ?'
  ).bind(params.id).all<{ name: string; sets: number; unit: string | null }>();

  // Templates store the exercise plan only — reps and weight are blanked
  // so the user fills them in fresh when applying.
  const exercises = rows.results.map(e => ({
    name: e.name,
    sets: e.sets,
    reps: null,
    weight: null,
    unit: e.unit
  }));

  const templates = await db.prepare(
    'SELECT id, title, tag FROM templates WHERE user_id = ? ORDER BY created_at DESC'
  ).bind(user.id).all<{ id: string; title: string; tag: string | null }>();

  return {
    workout,
    exercises,
    templates: templates.results
  };
};
