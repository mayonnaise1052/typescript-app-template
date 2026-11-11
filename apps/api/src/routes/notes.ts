import {
  CreateNoteInputSchema,
  NoteIdSchema,
  NoteListQuerySchema,
  UpdateNoteInputSchema,
} from '@typequest/shared';
import { Hono } from 'hono';
import { z } from 'zod';
import type { AppEnv } from '../env';
import { unwrap } from '../lib/unwrap';
import { requireAuth } from '../middleware/auth';
import { validate } from '../middleware/validate';

const NoteParamSchema = z.object({ noteId: NoteIdSchema });

export const noteRoutes = new Hono<AppEnv>()
  .use(requireAuth)
  .get('/', validate('query', NoteListQuerySchema), async (c) => {
    const notes = await c.var.services.notes.list(c.var.user.id, c.req.valid('query'));
    return c.json(notes, 200);
  })
  .post('/', validate('json', CreateNoteInputSchema), async (c) => {
    const note = unwrap(await c.var.services.notes.create(c.var.user.id, c.req.valid('json')));
    return c.json({ note }, 201);
  })
  .get('/:noteId', validate('param', NoteParamSchema), async (c) => {
    const { noteId } = c.req.valid('param');
    const note = unwrap(await c.var.services.notes.get(c.var.user.id, noteId));
    return c.json({ note }, 200);
  })
  .patch(
    '/:noteId',
    validate('param', NoteParamSchema),
    validate('json', UpdateNoteInputSchema),
    async (c) => {
      const { noteId } = c.req.valid('param');
      const note = unwrap(
        await c.var.services.notes.update(c.var.user.id, noteId, c.req.valid('json')),
      );
      return c.json({ note }, 200);
    },
  )
  .delete('/:noteId', validate('param', NoteParamSchema), async (c) => {
    const { noteId } = c.req.valid('param');
    unwrap(await c.var.services.notes.delete(c.var.user.id, noteId));
    return c.json({ ok: true }, 200);
  });
