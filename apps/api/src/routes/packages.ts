import {
  BookmarkIdSchema,
  CreateBookmarkInputSchema,
  PackageSearchQuerySchema,
} from '@typequest/shared';
import { Hono } from 'hono';
import { z } from 'zod';
import type { AppEnv } from '../env';
import { unwrap } from '../lib/unwrap';
import { requireAuth } from '../middleware/auth';
import { rateLimit } from '../middleware/rate-limit';
import { validate } from '../middleware/validate';

const BookmarkParamSchema = z.object({ bookmarkId: BookmarkIdSchema });

export const packageRoutes = new Hono<AppEnv>()
  .use(requireAuth)
  // 外部 API を呼ぶエンドポイントは、踏み台にされないようレート制限をかけます。
  .get(
    '/search',
    rateLimit('packageSearch'),
    validate('query', PackageSearchQuerySchema),
    async (c) => {
      const packages = unwrap(await c.var.services.packages.search(c.req.valid('query').q));
      return c.json({ packages }, 200);
    },
  )
  .get('/bookmarks', async (c) => {
    const bookmarks = await c.var.services.packages.listBookmarks(c.var.user.id);
    return c.json({ bookmarks }, 200);
  })
  .post('/bookmarks', validate('json', CreateBookmarkInputSchema), async (c) => {
    const bookmark = unwrap(
      await c.var.services.packages.addBookmark(c.var.user.id, c.req.valid('json')),
    );
    return c.json({ bookmark }, 201);
  })
  .delete('/bookmarks/:bookmarkId', validate('param', BookmarkParamSchema), async (c) => {
    const { bookmarkId } = c.req.valid('param');
    unwrap(await c.var.services.packages.removeBookmark(c.var.user.id, bookmarkId));
    return c.json({ ok: true }, 200);
  });
