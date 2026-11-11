import { LessonIdSchema, QuizSubmissionSchema } from '@typequest/shared';
import { Hono } from 'hono';
import { z } from 'zod';
import type { AppEnv } from '../env';
import { unwrap } from '../lib/unwrap';
import { requireAuth } from '../middleware/auth';
import { validate } from '../middleware/validate';

const LessonParamSchema = z.object({ lessonId: LessonIdSchema });

export const lessonRoutes = new Hono<AppEnv>()
  .use(requireAuth)
  .get('/', async (c) => {
    const lessons = await c.var.services.lessons.list(c.var.user.id);
    return c.json({ lessons }, 200);
  })
  .get('/:lessonId', validate('param', LessonParamSchema), async (c) => {
    const { lessonId } = c.req.valid('param');
    const lesson = unwrap(await c.var.services.lessons.get(c.var.user.id, lessonId));
    return c.json({ lesson }, 200);
  })
  .post(
    '/:lessonId/quiz',
    validate('param', LessonParamSchema),
    validate('json', QuizSubmissionSchema),
    async (c) => {
      const { lessonId } = c.req.valid('param');
      const result = unwrap(
        await c.var.services.quiz.submit(c.var.user.id, lessonId, c.req.valid('json')),
      );
      return c.json({ result }, 200);
    },
  );
