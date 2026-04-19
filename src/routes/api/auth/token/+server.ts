// src/routes/api/auth/token/+server.ts
import { json } from '@sveltejs/kit';
import type { RequestHandler } from '@sveltejs/kit';
import { getSessionId } from '$lib/auth';
import type { User } from '$lib/auth';

async function getUserFromSession(request: Request, db: D1Database): Promise<User | null> {
  const sessionId = getSessionId(request);
  if (!sessionId) return null;
  return db
    .prepare(`
      SELECT u.id, u.google_id, u.email, u.name, u.picture, u.created_at
      FROM sessions s JOIN users u ON u.id = s.user_id
      WHERE s.id = ? AND s.expires_at > datetime('now')
    `)
    .bind(sessionId)
    .first<User>();
}

// GET /api/auth/token — return current token for the logged-in user
export const GET: RequestHandler = async ({ request, platform }) => {
  const db = platform?.env.DB;
  if (!db) return json({ error: 'Database not available' }, { status: 500 });

  const user = await getUserFromSession(request, db);
  if (!user) return json({ error: 'Unauthorized' }, { status: 401 });

  const row = await db
    .prepare('SELECT token FROM api_tokens WHERE user_id = ?')
    .bind(user.id)
    .first<{ token: string }>();

  return json({ token: row?.token ?? null });
};

// POST /api/auth/token — generate or replace token
export const POST: RequestHandler = async ({ request, platform }) => {
  const db = platform?.env.DB;
  if (!db) return json({ error: 'Database not available' }, { status: 500 });

  const user = await getUserFromSession(request, db);
  if (!user) return json({ error: 'Unauthorized' }, { status: 401 });

  const token = 'wkt_' + crypto.randomUUID().replace(/-/g, '');

  await db
    .prepare(`
      INSERT INTO api_tokens (id, user_id, token, created_at)
      VALUES (?, ?, ?, datetime('now'))
      ON CONFLICT(user_id) DO UPDATE SET token = excluded.token, created_at = excluded.created_at
    `)
    .bind(crypto.randomUUID(), user.id, token)
    .run();

  return json({ token });
};
