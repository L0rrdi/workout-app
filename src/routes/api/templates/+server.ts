// src/routes/api/templates/+server.ts
import { json } from '@sveltejs/kit';
import type { RequestHandler } from '@sveltejs/kit';
import { getUser } from '$lib/auth';

export interface Template {
  id: string;
  title: string;
  tag: string | null;
  exercises: { name: string; sets: number; reps: number | null; weight: number | null; unit: string | null }[];
}

// GET /api/templates
export const GET: RequestHandler = async ({ request, platform }) => {
  const db = platform?.env.DB;
  if (!db) return json({ error: 'Database not available' }, { status: 500 });

  const user = await getUser(request, db);
  if (!user) return json({ error: 'Unauthorized' }, { status: 401 });

  const rows = await db
    .prepare('SELECT id, title, tag, exercises FROM templates WHERE user_id = ? ORDER BY created_at DESC')
    .bind(user.id)
    .all<{ id: string; title: string; tag: string | null; exercises: string }>();

  const templates = rows.results.map(r => ({
    id: r.id,
    title: r.title,
    tag: r.tag,
    exercises: JSON.parse(r.exercises)
  }));

  return json(templates);
};

// POST /api/templates — save a new template
export const POST: RequestHandler = async ({ request, platform }) => {
  const db = platform?.env.DB;
  if (!db) return json({ error: 'Database not available' }, { status: 500 });

  const user = await getUser(request, db);
  if (!user) return json({ error: 'Unauthorized' }, { status: 401 });

  const { title, tag, exercises } = await request.json();

  await db
    .prepare('INSERT INTO templates (id, user_id, title, tag, exercises) VALUES (?, ?, ?, ?, ?)')
    .bind(crypto.randomUUID(), user.id, title, tag ?? null, JSON.stringify(exercises))
    .run();

  return json({ success: true });
};

// PUT /api/templates?id=xxx — update title + tag + exercises
export const PUT: RequestHandler = async ({ request, url, platform }) => {
  const db = platform?.env.DB;
  if (!db) return json({ error: 'Database not available' }, { status: 500 });

  const user = await getUser(request, db);
  if (!user) return json({ error: 'Unauthorized' }, { status: 401 });

  const id = url.searchParams.get('id');
  if (!id) return json({ error: 'Missing id' }, { status: 400 });

  const { title, tag, exercises } = await request.json();

  await db
    .prepare('UPDATE templates SET title = ?, tag = ?, exercises = ? WHERE id = ? AND user_id = ?')
    .bind(title, tag ?? null, JSON.stringify(exercises), id, user.id)
    .run();

  return json({ success: true });
};

// DELETE /api/templates?id=xxx
export const DELETE: RequestHandler = async ({ request, url, platform }) => {
  const db = platform?.env.DB;
  if (!db) return json({ error: 'Database not available' }, { status: 500 });

  const user = await getUser(request, db);
  if (!user) return json({ error: 'Unauthorized' }, { status: 401 });

  const id = url.searchParams.get('id');
  if (!id) return json({ error: 'Missing id' }, { status: 400 });

  await db
    .prepare('DELETE FROM templates WHERE id = ? AND user_id = ?')
    .bind(id, user.id)
    .run();

  return json({ success: true });
};
