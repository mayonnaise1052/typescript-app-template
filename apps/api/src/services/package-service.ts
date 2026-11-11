import {
  appError,
  err,
  ok,
  PackageInfoSchema,
  type AppError,
  type Bookmark,
  type BookmarkId,
  type CreateBookmarkInput,
  type PackageInfo,
  type Result,
  type UserId,
} from '@typequest/shared';
import { z } from 'zod';
import { MAX_BOOKMARKS_PER_USER, PACKAGE_SEARCH_CACHE_TTL_MS } from '../config/config';
import type { BookmarkRow } from '../db/schema';
import type { NpmRegistryClient } from '../lib/npm-registry';
import type { BookmarkRepository } from '../repositories/bookmark-repository';
import type { CacheRepository } from '../repositories/cache-repository';

const CachedPackagesSchema = z.array(PackageInfoSchema);

function toBookmark(row: BookmarkRow): Bookmark {
  return {
    id: row.id,
    name: row.name,
    version: row.version,
    description: row.description,
    createdAt: row.createdAt.toISOString(),
  };
}

type Deps = {
  npm: NpmRegistryClient;
  cache: CacheRepository;
  bookmarks: BookmarkRepository;
  now: () => Date;
};

export function createPackageService({ npm, cache, bookmarks, now }: Deps) {
  return {
    /**
     * npm レジストリを検索します。同じ検索語の結果は一定時間キャッシュし、
     * 外部 API への問い合わせ回数を抑えます。
     */
    async search(query: string): Promise<Result<PackageInfo[], AppError>> {
      const cacheKey = `npm-search:${query.toLowerCase()}`;

      const cached = await cache.get(cacheKey, now());
      if (cached !== undefined) {
        // キャッシュの中身も「外から来た文字列」なので、検証してから使います。
        const parsed = CachedPackagesSchema.safeParse(safeJsonParse(cached));
        if (parsed.success) return ok(parsed.data);
      }

      const result = await npm.search(query);
      if (result.ok) {
        const expiresAt = new Date(now().getTime() + PACKAGE_SEARCH_CACHE_TTL_MS);
        await cache.set(cacheKey, JSON.stringify(result.value), expiresAt);
      }
      return result;
    },

    async listBookmarks(userId: UserId): Promise<Bookmark[]> {
      return (await bookmarks.list(userId)).map(toBookmark);
    },

    async addBookmark(
      userId: UserId,
      input: CreateBookmarkInput,
    ): Promise<Result<Bookmark, AppError>> {
      if ((await bookmarks.count(userId)) >= MAX_BOOKMARKS_PER_USER) {
        return err(
          appError('CONFLICT', `ブックマークは ${MAX_BOOKMARKS_PER_USER} 件まで登録できます`),
        );
      }

      const row: BookmarkRow = {
        id: crypto.randomUUID() as BookmarkId,
        userId,
        name: input.name,
        version: input.version,
        description: input.description,
        createdAt: now(),
      };
      const inserted = await bookmarks.insert(row);
      return inserted
        ? ok(toBookmark(row))
        : err(appError('CONFLICT', 'このパッケージはすでにブックマークされています'));
    },

    async removeBookmark(userId: UserId, id: BookmarkId): Promise<Result<null, AppError>> {
      return (await bookmarks.delete(userId, id))
        ? ok(null)
        : err(appError('NOT_FOUND', 'ブックマークが見つかりません'));
    },
  };
}

function safeJsonParse(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return undefined;
  }
}

export type PackageService = ReturnType<typeof createPackageService>;
