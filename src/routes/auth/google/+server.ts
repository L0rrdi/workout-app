// src/routes/auth/google/+server.ts
// Redirects the user to Google's OAuth login page
import { redirect } from '@sveltejs/kit';
import type { RequestHandler } from '@sveltejs/kit';

export const GET: RequestHandler = async ({ platform, url }) => {
  const clientId = platform?.env.GOOGLE_CLIENT_ID;
  if (!clientId) throw new Error('GOOGLE_CLIENT_ID not set');

  const redirectUri = `${url.origin}/auth/google/callback`;

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: 'openid email profile',
    prompt: 'select_account'
  });

  throw redirect(302, `https://accounts.google.com/o/oauth2/v2/auth?${params}`);
};
