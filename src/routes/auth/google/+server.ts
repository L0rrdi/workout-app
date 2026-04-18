// src/routes/auth/google/+server.ts
import { redirect } from '@sveltejs/kit';
import type { RequestHandler } from '@sveltejs/kit';

export const GET: RequestHandler = async ({ platform, url, cookies }) => {
  const clientId = platform?.env.GOOGLE_CLIENT_ID;
  if (!clientId) throw new Error('GOOGLE_CLIENT_ID not set');

  const state = crypto.randomUUID();
  cookies.set('oauth_state', state, {
    httpOnly: true,
    path: '/',
    maxAge: 600, // 10 minutes to complete login
    sameSite: 'lax',
    secure: true
  });

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: `${url.origin}/auth/google/callback`,
    response_type: 'code',
    scope: 'openid email profile',
    prompt: 'select_account',
    state
  });

  throw redirect(302, `https://accounts.google.com/o/oauth2/v2/auth?${params}`);
};
