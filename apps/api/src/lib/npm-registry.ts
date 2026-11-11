/**
 * 外部 API（npm レジストリ）のクライアント。
 *
 * 外部 API を呼ぶときの定石を一通り入れています。
 *   1. タイムアウト     … 相手が応答しなくても待ち続けない
 *   2. リトライ         … 一時的な失敗（通信エラー / 5xx / 429）だけをやり直す
 *   3. 応答の検証       … 外部の JSON は信用せず、Zod で形を確かめてから使う
 *   4. 依存の注入       … fetch を引数で受け取り、テストでは偽物に差し替える
 *   5. Result で返す    … 失敗を例外ではなく戻り値で表し、呼び出し側に処理を強制する
 */
import {
  appError,
  err,
  ok,
  PackageInfoSchema,
  type AppError,
  type PackageInfo,
  type Result,
} from '@typequest/shared';
import { z } from 'zod';

/** npm の検索 API の応答のうち、このアプリが使う部分だけを定義します。 */
const NpmSearchResponseSchema = z.object({
  objects: z.array(
    z.object({
      package: z.object({
        name: z.string(),
        version: z.string(),
        description: z.string().optional(),
      }),
    }),
  ),
});

export type FetchLike = (input: string, init?: { signal?: AbortSignal }) => Promise<Response>;

export type NpmRegistryClientOptions = {
  fetch: FetchLike;
  baseUrl?: string;
  timeoutMs?: number;
  maxRetries?: number;
  /** リトライ前の待機。テストでは即座に解決する関数へ差し替えます。 */
  sleep?: (ms: number) => Promise<void>;
};

export type NpmRegistryClient = {
  search(query: string, size?: number): Promise<Result<PackageInfo[], AppError>>;
};

const defaultSleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

const isRetryableStatus = (status: number) => status === 429 || status >= 500;

export function createNpmRegistryClient(options: NpmRegistryClientOptions): NpmRegistryClient {
  const {
    fetch,
    baseUrl = 'https://registry.npmjs.org',
    timeoutMs = 5000,
    maxRetries = 2,
    sleep = defaultSleep,
  } = options;

  const unavailable = () =>
    err(appError('EXTERNAL_SERVICE_ERROR', 'npm レジストリから情報を取得できませんでした'));

  return {
    async search(query, size = 10) {
      // URL は文字列連結ではなく URL / URLSearchParams で組み立て、エスケープ漏れを防ぎます。
      const url = new URL('/-/v1/search', baseUrl);
      url.searchParams.set('text', query);
      url.searchParams.set('size', String(size));

      for (let attempt = 0; attempt <= maxRetries; attempt++) {
        if (attempt > 0) await sleep(200 * 2 ** (attempt - 1));

        let response: Response;
        try {
          response = await fetch(url.toString(), { signal: AbortSignal.timeout(timeoutMs) });
        } catch {
          continue; // 通信エラーやタイムアウトはリトライ対象
        }

        if (isRetryableStatus(response.status)) continue;
        if (!response.ok) return unavailable(); // 4xx はやり直しても結果が変わらない

        // catch 節で受け取る値や response.json() の結果は「何が入っているか分からない」ので
        // unknown として受け、スキーマで検証してから使います。
        const json: unknown = await response.json().catch(() => null);
        const parsed = NpmSearchResponseSchema.safeParse(json);
        if (!parsed.success) return unavailable();

        const packages = parsed.data.objects.flatMap(({ package: pkg }) => {
          const candidate = PackageInfoSchema.safeParse({
            name: pkg.name,
            version: pkg.version,
            description: (pkg.description ?? '').slice(0, 500),
          });
          return candidate.success ? [candidate.data] : [];
        });
        return ok(packages);
      }

      return unavailable();
    },
  };
}
