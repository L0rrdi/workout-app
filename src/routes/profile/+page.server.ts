// src/routes/profile/+page.server.ts
import type { PageServerLoad } from './$types';
import { ADMIN_EMAIL } from '$lib/auth';

export const load: PageServerLoad = async ({ parent }) => {
  const { user } = await parent();
  return {
    isAdmin: user?.email === ADMIN_EMAIL
  };
};
