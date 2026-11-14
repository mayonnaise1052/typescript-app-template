import { http, HttpResponse } from 'msw';
import { page } from 'vitest/browser';
import { beforeEach, describe, expect, it } from 'vitest';
import { authHandlers, testLesson } from '../../test/fixtures';
import { renderApp } from '../../test/render';
import { worker } from '../../test/server';

type StoredNote = {
  id: string;
  lessonId: string | null;
  title: string;
  body: string;
  createdAt: string;
  updatedAt: string;
};

/** テストごとに作り直す、メモリ上の偽のバックエンド。 */
let notes: StoredNote[];
let lastQuery: URLSearchParams;

beforeEach(() => {
  notes = [
    {
      id: '11111111-1111-4111-8111-111111111111',
      lessonId: 'generics',
      title: '型引数のメモ',
      body: 'T は型の引数',
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    },
  ];
  lastQuery = new URLSearchParams();

  worker.use(
    authHandlers.signedIn(),
    http.get('*/api/lessons', () => HttpResponse.json({ lessons: [testLesson] })),
    http.get('*/api/notes', ({ request }) => {
      lastQuery = new URL(request.url).searchParams;
      const q = lastQuery.get('q') ?? '';
      const items = notes.filter((note) => note.title.includes(q));
      return HttpResponse.json({
        items,
        page: Number(lastQuery.get('page')),
        pageSize: 5,
        totalItems: items.length,
        totalPages: 1,
      });
    }),
    http.post('*/api/notes', async ({ request }) => {
      const input = (await request.json()) as Pick<StoredNote, 'title' | 'body' | 'lessonId'>;
      const note: StoredNote = {
        ...input,
        id: '22222222-2222-4222-8222-222222222222',
        createdAt: '2026-01-02T00:00:00.000Z',
        updatedAt: '2026-01-02T00:00:00.000Z',
      };
      notes = [note, ...notes];
      return HttpResponse.json({ note }, { status: 201 });
    }),
    http.delete('*/api/notes/:noteId', ({ params }) => {
      notes = notes.filter((note) => note.id !== params.noteId);
      return HttpResponse.json({ ok: true });
    }),
  );
});

/** 画面を描画し、最初のノートが表示されるまで待ちます。 */
async function renderNotes(url = '/notes') {
  const rendered = await renderApp(url);
  await expect
    .element(rendered.screen.getByRole('heading', { name: '型引数のメモ' }))
    .toBeVisible();
  return rendered;
}

describe('ノート画面', () => {
  it('ノートの一覧を表示する', async () => {
    const { screen } = await renderNotes();

    await expect.element(screen.getByText('T は型の引数')).toBeVisible();
    await expect
      .element(screen.getByRole('link', { name: 'ジェネリクス' }))
      .toHaveAttribute('href', '/lessons/generics');
  });

  it('新しいノートを作成すると一覧に追加され、通知が表示される', async () => {
    const { screen } = await renderNotes();

    await screen.getByRole('button', { name: '新しいノート' }).click();
    await screen.getByLabelText('タイトル').fill('satisfies のメモ');
    await screen.getByLabelText('本文').fill('型を広げずに検査する');
    await screen.getByRole('button', { name: '保存する' }).click();

    await expect.element(screen.getByRole('heading', { name: 'satisfies のメモ' })).toBeVisible();
    // 通知（トースト）は画面の端に表示されるので、ページ全体から探します。
    await expect.element(page.getByText('ノートを保存しました')).toBeVisible();
    // 保存に成功したらフォームが閉じる
    await expect.element(screen.getByLabelText('タイトル')).not.toBeInTheDocument();
  });

  it('タイトルが空なら保存せず、エラーを表示する', async () => {
    const { screen } = await renderNotes();

    await screen.getByRole('button', { name: '新しいノート' }).click();
    await screen.getByRole('button', { name: '保存する' }).click();

    await expect.element(screen.getByText('タイトルを入力してください')).toBeVisible();
    expect(notes).toHaveLength(1);
  });

  it('API が返した項目ごとのエラーを、該当する入力欄に表示する', async () => {
    worker.use(
      http.post('*/api/notes', () =>
        HttpResponse.json(
          {
            error: {
              code: 'VALIDATION_ERROR',
              message: '入力内容を確認してください',
              details: { lessonId: ['指定されたレッスンは存在しません'] },
            },
          },
          { status: 400 },
        ),
      ),
    );
    const { screen } = await renderNotes();

    await screen.getByRole('button', { name: '新しいノート' }).click();
    await screen.getByLabelText('タイトル').fill('メモ');
    await screen.getByLabelText('本文').fill('本文');
    await screen.getByRole('button', { name: '保存する' }).click();

    await expect.element(screen.getByText('指定されたレッスンは存在しません')).toBeVisible();
    await expect
      .element(screen.getByLabelText('関連するレッスン（任意）'))
      .toHaveAttribute('aria-invalid', 'true');
    await expect.element(screen.getByText('入力内容を確認してください')).toBeVisible();
  });

  it('検索語を API に渡し、URL にも反映する。結果がなければその旨を表示する', async () => {
    const { screen, router } = await renderNotes();

    await screen.getByRole('searchbox', { name: 'ノートを検索' }).fill('存在しない');
    await screen.getByRole('button', { name: '検索' }).click();

    await expect.element(screen.getByText('条件に一致するノートはありません。')).toBeVisible();
    expect(lastQuery.get('q')).toBe('存在しない');
    // 既定値（page: 1）は URL に書かない設定なので、検索語だけが残る
    expect(router.state.location.search).toEqual({ q: '存在しない' });
    expect(router.state.location.href).toBe(`/notes?q=${encodeURIComponent('存在しない')}`);
  });

  it('不正な検索条件の URL でも、エラーにならず 1 ページ目を表示する', async () => {
    const { router } = await renderNotes('/notes?page=abc&lessonId=Not%20Valid!');

    expect(lastQuery.get('page')).toBe('1');
    expect(lastQuery.get('lessonId')).toBeNull();
    // 不正な値は既定値に置き換わり、既定値は URL に書かれないので、URL は /notes だけになる
    expect(router.state.location.href).toBe('/notes');
  });

  it('削除の確認ダイアログで「キャンセル」を押すと、削除しない', async () => {
    const { screen } = await renderNotes();

    await screen.getByRole('button', { name: '削除' }).click();
    const dialog = page.getByRole('alertdialog', { name: 'ノートを削除しますか？' });
    await expect.element(dialog).toBeVisible();
    await dialog.getByRole('button', { name: 'キャンセル' }).click();

    await expect.element(dialog).not.toBeInTheDocument();
    await expect.element(screen.getByRole('heading', { name: '型引数のメモ' })).toBeVisible();
    expect(notes).toHaveLength(1);
  });

  it('削除の確認ダイアログで「削除する」を押すと、削除して通知する', async () => {
    const { screen } = await renderNotes();

    await screen.getByRole('button', { name: '削除' }).click();
    await page.getByRole('alertdialog').getByRole('button', { name: '削除する' }).click();

    await expect
      .element(screen.getByRole('heading', { name: '型引数のメモ' }))
      .not.toBeInTheDocument();
    await expect.element(page.getByText('「型引数のメモ」を削除しました')).toBeVisible();
    expect(notes).toHaveLength(0);
  });
});
