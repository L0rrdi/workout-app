// src/routes/auth/logout/+server.ts
import { redirect } from '@sveltejs/kit';
import type { RequestHandler } from '@sveltejs/kit';

export const GET: RequestHandler = async ({ platform, cookies }) => {
  const db = platform?.env.DB;
  const sessionId = cookies.get('session');

  if (db && sessionId) {
    await db.prepare('DELETE FROM sessions WHERE id = ?').bind(sessionId).run();
  }

  cookies.delete('session', { path: '/' });
  throw redirect(302, '/login');
};
