// src/routes/auth/logout/+server.ts
import { redirect } from '@sveltejs/kit';
import type { RequestHandler } from '@sveltejs/kit';
import { getSessionId, clearSessionCookie } from '$lib/auth';

export const GET: RequestHandler = async ({ request, platform }) => {
  const db = platform?.env.DB;
  const sessionId = getSessionId(request);

  if (db && sessionId) {
    await db.prepare('DELETE FROM sessions WHERE id = ?').bind(sessionId).run();
  }

  throw redirect(302, '/login', {
    headers: { 'Set-Cookie': clearSessionCookie() }
  });
};
