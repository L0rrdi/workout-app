// src/lib/auth.ts
export interface User {
  id: string;
  google_id: string;
  email: string;
  name: string;
  picture: string | null;
  created_at: string;
}

export function getSessionId(request: Request): string | null {
  const cookie = request.headers.get('cookie') ?? '';
  const match = cookie.match(/(?:^|;\s*)session=([^;]+)/);
  return match ? match[1] : null;
}

export async function getUser(request: Request, db: D1Database): Promise<User | null> {
  // Bearer token auth (for iOS app)
  const auth = request.headers.get('authorization') ?? '';
  if (auth.startsWith('Bearer ')) {
    const token = auth.slice(7).trim();
    const row = await db
      .prepare(`
        SELECT u.id, u.google_id, u.email, u.name, u.picture, u.created_at
        FROM api_tokens t
        JOIN users u ON u.id = t.user_id
        WHERE t.token = ?
      `)
      .bind(token)
      .first<User>();
    if (row) return row;
  }

  // Session cookie auth (for web)
  const sessionId = getSessionId(request);
  if (!sessionId) return null;

  const row = await db
    .prepare(`
      SELECT u.id, u.google_id, u.email, u.name, u.picture, u.created_at
      FROM sessions s
      JOIN users u ON u.id = s.user_id
      WHERE s.id = ? AND s.expires_at > datetime('now')
    `)
    .bind(sessionId)
    .first<User>();

  return row ?? null;
}

export const ADMIN_EMAIL = 'nosviland@gmail.com';
