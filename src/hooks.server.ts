// src/hooks.server.ts
import type { Handle, HandleServerError } from '@sveltejs/kit';

export const handle: Handle = async ({ event, resolve }) => {
  const response = await resolve(event);

  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('Content-Security-Policy', "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https://lh3.googleusercontent.com");

  return response;
};

export const handleError: HandleServerError = ({ error, event }) => {
  console.error(`[Error] ${event.request.method} ${event.url.pathname}`, error);
};
