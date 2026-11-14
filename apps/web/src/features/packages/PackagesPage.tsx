import {
  queryOptions,
  useMutation,
  useQuery,
  useQueryClient,
  useSuspenseQuery,
} from '@tanstack/react-query';
import { PackageSearchQuerySchema, type Bookmark, type PackageInfo } from '@typequest/shared';
import { useState, type ReactNode, type SubmitEvent } from 'react';
import { toast } from 'sonner';
import { EmptyState, ErrorMessage, Loading } from '../../components/Feedback';
import { Button } from '../../components/ui/button';
import { Card, CardContent } from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import { api, errorMessage, unwrap } from '../../lib/api';
import { queryKeys } from '../../lib/query';

/** ルートの loader と画面の両方から使うので、定義を export します。 */
export const bookmarksQuery = queryOptions({
  queryKey: queryKeys.bookmarks,
  queryFn: async () => (await unwrap(api.packages.bookmarks.$get())).bookmarks,
});

function usePackageSearch(q: string) {
  return useQuery({
    queryKey: queryKeys.packageSearch(q),
    queryFn: async () => (await unwrap(api.packages.search.$get({ query: { q } }))).packages,
    // 検索語が空の間は問い合わせません。
    enabled: q.length > 0,
    staleTime: 5 * 60_000,
  });
}

/** 外部サイトへのリンク。URL は文字列連結ではなく、パッケージ名をエンコードして組み立てます。 */
function npmUrl(name: string): string {
  return `https://www.npmjs.com/package/${name.split('/').map(encodeURIComponent).join('/')}`;
}

function PackageCard({ pkg, action }: { pkg: PackageInfo | Bookmark; action: ReactNode }) {
  return (
    <li>
      <Card>
        <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <h3 className="font-semibold [overflow-wrap:anywhere]">
              {/* rel="noopener noreferrer": 開いた先のページから、このページを操作されないようにします。 */}
              <a
                href={npmUrl(pkg.name)}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary underline underline-offset-4"
              >
                {pkg.name}
              </a>{' '}
              <small className="font-medium text-muted-foreground">{pkg.version}</small>
            </h3>
            <p className="mt-0.5 text-sm text-muted-foreground [overflow-wrap:anywhere]">
              {pkg.description || '（説明なし）'}
            </p>
          </div>
          {action}
        </CardContent>
      </Card>
    </li>
  );
}

export function PackagesPage() {
  const queryClient = useQueryClient();
  const [query, setQuery] = useState('');
  const [inputError, setInputError] = useState<string>();

  const search = usePackageSearch(query);
  // ブックマーク一覧は表示に必須なので Suspense で待ちます（ルートの loader が先に取得済み）。
  // 検索結果は利用者の操作で変わるので、従来どおり useQuery でその場に読み込み中を表示します。
  const { data: bookmarks } = useSuspenseQuery(bookmarksQuery);
  const invalidateBookmarks = () =>
    queryClient.invalidateQueries({ queryKey: queryKeys.bookmarks });

  const addBookmark = useMutation({
    mutationFn: (pkg: PackageInfo) => unwrap(api.packages.bookmarks.$post({ json: pkg })),
    onSuccess: async ({ bookmark }) => {
      await invalidateBookmarks();
      toast.success(`${bookmark.name} をブックマークしました`);
    },
    onError: (error) => toast.error(errorMessage(error)),
  });
  const removeBookmark = useMutation({
    mutationFn: (bookmark: Bookmark) =>
      unwrap(api.packages.bookmarks[':bookmarkId'].$delete({ param: { bookmarkId: bookmark.id } })),
    onSuccess: async (_result, bookmark) => {
      await invalidateBookmarks();
      toast.success(`${bookmark.name} のブックマークを外しました`);
    },
    onError: (error) => toast.error(errorMessage(error)),
  });

  function handleSearch(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    const parsed = PackageSearchQuerySchema.safeParse({
      q: new FormData(event.currentTarget).get('q'),
    });
    if (!parsed.success) {
      setInputError(parsed.error.issues[0]?.message);
      return;
    }
    setInputError(undefined);
    setQuery(parsed.data.q);
  }

  const bookmarkedNames = new Set(bookmarks.map((bookmark) => bookmark.name));

  return (
    <>
      <h1 className="text-3xl font-bold">パッケージ</h1>
      <p className="mt-2 max-w-2xl text-muted-foreground">
        npm レジストリを検索して、気になるパッケージをブックマークできます。検索は、このアプリの API
        が外部の API を呼び出して行います。
      </p>

      <form onSubmit={handleSearch} className="mt-5 flex flex-wrap gap-2" role="search">
        <label className="sr-only" htmlFor="package-search">
          パッケージを検索
        </label>
        <Input
          id="package-search"
          name="q"
          type="search"
          placeholder="例: zod"
          maxLength={100}
          aria-invalid={inputError ? true : undefined}
          className="w-auto flex-[1_1_14rem]"
        />
        <Button type="submit" variant="default">
          検索
        </Button>
      </form>
      {inputError && <ErrorMessage className="mt-3">{inputError}</ErrorMessage>}

      {query && (
        <section className="mt-8">
          <h2 className="mb-3 text-xl font-bold">「{query}」の検索結果</h2>
          {search.isPending ? (
            <Loading label="検索中…" />
          ) : search.error ? (
            <ErrorMessage error={search.error} />
          ) : search.data.length === 0 ? (
            <EmptyState>一致するパッケージはありませんでした。</EmptyState>
          ) : (
            <ul className="grid gap-3">
              {search.data.map((pkg) => (
                <PackageCard
                  key={pkg.name}
                  pkg={pkg}
                  action={
                    <Button
                      variant="outline"
                      disabled={bookmarkedNames.has(pkg.name) || addBookmark.isPending}
                      onClick={() => addBookmark.mutate(pkg)}
                    >
                      {bookmarkedNames.has(pkg.name) ? 'ブックマーク済み' : 'ブックマーク'}
                    </Button>
                  }
                />
              ))}
            </ul>
          )}
        </section>
      )}

      <section className="mt-8">
        <h2 className="mb-3 text-xl font-bold">ブックマーク</h2>
        {bookmarks.length === 0 ? (
          <EmptyState>まだブックマークがありません。</EmptyState>
        ) : (
          <ul className="grid gap-3">
            {bookmarks.map((bookmark) => (
              <PackageCard
                key={bookmark.id}
                pkg={bookmark}
                action={
                  <Button
                    variant="destructive"
                    disabled={removeBookmark.isPending}
                    onClick={() => removeBookmark.mutate(bookmark)}
                  >
                    削除
                  </Button>
                }
              />
            ))}
          </ul>
        )}
      </section>
    </>
  );
}
