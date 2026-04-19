// src/routes/+layout.server.ts
import type { LayoutServerLoad } from './$types';
import { redirect } from '@sveltejs/kit';
import { getUser, ADMIN_EMAIL } from '$lib/auth';

const PUBLIC_ROUTES = ['/login', '/auth'];

export const load: LayoutServerLoad = async ({ request, platform, url }) => {
  const isPublic = PUBLIC_ROUTES.some(r => url.pathname.startsWith(r));

  const db = platform?.env.DB;
  if (!db) return { user: null };

  const user = await getUser(request, db);

  if (!user && !isPublic) {
    throw redirect(302, '/login');
  }

  return { user, isAdmin: user?.email === ADMIN_EMAIL };
};
