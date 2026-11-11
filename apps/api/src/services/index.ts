import type { Database } from '../db/client';
import { createNpmRegistryClient, type FetchLike } from '../lib/npm-registry';
import { createBookmarkRepository } from '../repositories/bookmark-repository';
import { createCacheRepository } from '../repositories/cache-repository';
import { createLessonRepository } from '../repositories/lesson-repository';
import { createNoteRepository } from '../repositories/note-repository';
import { createProgressRepository } from '../repositories/progress-repository';
import { createRateLimitRepository } from '../repositories/rate-limit-repository';
import { createSessionRepository } from '../repositories/session-repository';
import { createUserRepository } from '../repositories/user-repository';
import { createAuthService } from './auth-service';
import { createLessonService } from './lesson-service';
import { createNoteService } from './note-service';
import { createPackageService } from './package-service';
import { createProgressService } from './progress-service';
import { createQuizService } from './quiz-service';
import { createRateLimitService } from './rate-limit-service';

export type ServiceDeps = {
  /** 外部 API 呼び出しに使う fetch。テストでは偽物を渡します。 */
  fetch: FetchLike;
  /** 現在時刻。テストでは固定した時刻を返す関数を渡します。 */
  now: () => Date;
};

/**
 * 依存関係の組み立て（Composition Root）。
 * 「どのサービスがどのリポジトリを使うか」をこの 1 か所にまとめています。
 */
export function createServices(db: Database, deps: ServiceDeps) {
  const { now } = deps;
  const lessons = createLessonRepository(db);
  const progress = createProgressRepository(db);

  return {
    auth: createAuthService({
      users: createUserRepository(db),
      sessions: createSessionRepository(db),
      now,
    }),
    lessons: createLessonService({ lessons }),
    quiz: createQuizService({ lessons, progress, now }),
    progress: createProgressService({ lessons, progress, now }),
    notes: createNoteService({ notes: createNoteRepository(db), lessons, now }),
    packages: createPackageService({
      npm: createNpmRegistryClient({ fetch: deps.fetch }),
      cache: createCacheRepository(db),
      bookmarks: createBookmarkRepository(db),
      now,
    }),
    rateLimit: createRateLimitService({ rateLimits: createRateLimitRepository(db), now }),
  };
}

export type Services = ReturnType<typeof createServices>;
