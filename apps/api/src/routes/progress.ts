import { Hono } from 'hono';
import type { AppEnv } from '../env';
import { requireAuth } from '../middleware/auth';

export const progressRoutes = new Hono<AppEnv>().use(requireAuth).get('/', async (c) => {
  const progress = await c.var.services.progress.getSummary(c.var.user.id);
  return c.json({ progress }, 200);
});
