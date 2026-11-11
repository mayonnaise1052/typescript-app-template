import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { PackageSearchQuerySchema, type PackageInfo } from '@typequest/shared';
import { useState, type SubmitEvent } from 'react';
import { ErrorMessage, Loading } from '../../components/Feedback';
import { api, unwrap } from '../../lib/api';
import { queryKeys } from '../../lib/query';

function usePackageSearch(q: string) {
  return useQuery({
    queryKey: queryKeys.packageSearch(q),
    queryFn: async () => (await unwrap(api.packages.search.$get({ query: { q } }))).packages,
    // 検索語が空の間は問い合わせません。
    enabled: q.length > 0,
    staleTime: 5 * 60_000,
  });
}

function useBookmarks() {
  return useQuery({
    queryKey: queryKeys.bookmarks,
    queryFn: async () => (await unwrap(api.packages.bookmarks.$get())).bookmarks,
  });
}

/** 外部サイトへのリンク。URL は文字列連結ではなく、パッケージ名をエンコードして組み立てます。 */
function npmUrl(name: string): string {
  return `https://www.npmjs.com/package/${name.split('/').map(encodeURIComponent).join('/')}`;
}

function PackageLink({ name }: { name: string }) {
  return (
    // rel="noopener noreferrer": 開いた先のページから、このページを操作されないようにします。
    <a href={npmUrl(name)} target="_blank" rel="noopener noreferrer">
      {name}
    </a>
  );
}

export function PackagesPage() {
  const queryClient = useQueryClient();
  const [query, setQuery] = useState('');
  const [inputError, setInputError] = useState<string>();

  const search = usePackageSearch(query);
  const bookmarks = useBookmarks();
  const invalidateBookmarks = () =>
    queryClient.invalidateQueries({ queryKey: queryKeys.bookmarks });

  const addBookmark = useMutation({
    mutationFn: (pkg: PackageInfo) => unwrap(api.packages.bookmarks.$post({ json: pkg })),
    onSuccess: invalidateBookmarks,
  });
  const removeBookmark = useMutation({
    mutationFn: (bookmarkId: string) =>
      unwrap(api.packages.bookmarks[':bookmarkId'].$delete({ param: { bookmarkId } })),
    onSuccess: invalidateBookmarks,
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

  const bookmarkedNames = new Set(bookmarks.data?.map((bookmark) => bookmark.name));

  return (
    <>
      <h1>パッケージ</h1>
      <p className="lead">
        npm レジストリを検索して、気になるパッケージをブックマークできます。検索は、このアプリの API
        が外部の API を呼び出して行います。
      </p>

      <form onSubmit={handleSearch} className="toolbar" role="search">
        <label className="visually-hidden" htmlFor="package-search">
          パッケージを検索
        </label>
        <input
          id="package-search"
          name="q"
          type="search"
          placeholder="例: zod"
          maxLength={100}
          aria-invalid={inputError ? true : undefined}
        />
        <button type="submit" className="button primary">
          検索
        </button>
      </form>
      {inputError && <ErrorMessage>{inputError}</ErrorMessage>}
      {addBookmark.error && <ErrorMessage error={addBookmark.error} />}

      {query && (
        <section>
          <h2>「{query}」の検索結果</h2>
          {search.isPending ? (
            <Loading label="検索中…" />
          ) : search.error ? (
            <ErrorMessage error={search.error} />
          ) : search.data.length === 0 ? (
            <p className="empty">一致するパッケージはありませんでした。</p>
          ) : (
            <ul className="package-list">
              {search.data.map((pkg) => (
                <li key={pkg.name} className="card package">
                  <div>
                    <h3>
                      <PackageLink name={pkg.name} /> <small>{pkg.version}</small>
                    </h3>
                    <p>{pkg.description || '（説明なし）'}</p>
                  </div>
                  <button
                    type="button"
                    className="button"
                    disabled={bookmarkedNames.has(pkg.name) || addBookmark.isPending}
                    onClick={() => addBookmark.mutate(pkg)}
                  >
                    {bookmarkedNames.has(pkg.name) ? 'ブックマーク済み' : 'ブックマーク'}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      <section>
        <h2>ブックマーク</h2>
        {bookmarks.isPending ? (
          <Loading />
        ) : bookmarks.error ? (
          <ErrorMessage error={bookmarks.error} />
        ) : bookmarks.data.length === 0 ? (
          <p className="empty">まだブックマークがありません。</p>
        ) : (
          <ul className="package-list">
            {bookmarks.data.map((bookmark) => (
              <li key={bookmark.id} className="card package">
                <div>
                  <h3>
                    <PackageLink name={bookmark.name} /> <small>{bookmark.version}</small>
                  </h3>
                  <p>{bookmark.description || '（説明なし）'}</p>
                </div>
                <button
                  type="button"
                  className="button ghost danger"
                  disabled={removeBookmark.isPending}
                  onClick={() => removeBookmark.mutate(bookmark.id)}
                >
                  削除
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}
