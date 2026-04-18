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
