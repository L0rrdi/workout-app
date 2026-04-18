// src/routes/auth/google/callback/+server.ts
import { redirect, json } from '@sveltejs/kit';
import type { RequestHandler } from '@sveltejs/kit';

export const GET: RequestHandler = async ({ url, platform, cookies }) => {
  const db = platform?.env.DB;
  const clientId = platform?.env.GOOGLE_CLIENT_ID;
  const clientSecret = platform?.env.GOOGLE_CLIENT_SECRET;

  if (!db || !clientId || !clientSecret) {
    return json({ error: 'Server misconfiguration' }, { status: 500 });
  }

  // Validate state to prevent CSRF
  const state = url.searchParams.get('state');
  const storedState = cookies.get('oauth_state');
  cookies.delete('oauth_state', { path: '/' });

  if (!state || !storedState || state !== storedState) {
    throw redirect(302, '/login?error=1');
  }

  const code = url.searchParams.get('code');
  if (!code) throw redirect(302, '/login?error=1');

  const redirectUri = `${url.origin}/auth/google/callback`;

  // Exchange code for tokens (10s timeout)
  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: 'authorization_code'
    }),
    signal: AbortSignal.timeout(10000)
  });

  if (!tokenRes.ok) throw redirect(302, '/login?error=1');

  const tokens = await tokenRes.json() as { access_token: string };

  // Get user info from Google (10s timeout)
  const userRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
    headers: { Authorization: `Bearer ${tokens.access_token}` },
    signal: AbortSignal.timeout(10000)
  });

  if (!userRes.ok) throw redirect(302, '/login?error=1');

  const googleUser = await userRes.json() as { id: string; email: string; name: string; picture: string };

  // Upsert user in D1
  const userId = crypto.randomUUID();
  await db.prepare(`
    INSERT INTO users (id, google_id, email, name, picture)
    VALUES (?, ?, ?, ?, ?)
    ON CONFLICT(google_id) DO UPDATE SET email = excluded.email, name = excluded.name, picture = excluded.picture
  `).bind(userId, googleUser.id, googleUser.email, googleUser.name, googleUser.picture ?? null).run();

  const user = await db.prepare('SELECT id FROM users WHERE google_id = ?')
    .bind(googleUser.id)
    .first<{ id: string }>();

  if (!user) throw redirect(302, '/login?error=1');

  // Create session (30 days)
  const sessionId = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
    .toISOString().replace('T', ' ').split('.')[0];

  await db.prepare('INSERT INTO sessions (id, user_id, expires_at) VALUES (?, ?, ?)')
    .bind(sessionId, user.id, expiresAt)
    .run();

  cookies.set('session', sessionId, {
    httpOnly: true,
    path: '/',
    maxAge: 60 * 60 * 24 * 30,
    sameSite: 'lax',
    secure: true
  });

  throw redirect(302, '/');
};
