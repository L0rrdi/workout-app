// src/routes/+layout.server.ts
// Runs on every page load — passes the current user to the layout
import type { LayoutServerLoad } from './$types';
import { getUser } from '$lib/auth';

export const load: LayoutServerLoad = async ({ request, platform }) => {
  const db = platform?.env.DB;
  if (!db) return { user: null };

  const user = await getUser(request, db);
  return { user };
};
