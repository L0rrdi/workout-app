// src/routes/profile/+page.server.ts
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ parent }) => {
  const { isAdmin } = await parent();
  return { isAdmin };
};
