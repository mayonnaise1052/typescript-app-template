import { http, HttpResponse } from 'msw';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { renderWithProviders } from '../../test/render';
import { worker } from '../../test/server';
import { NotesPage } from './NotesPage';

type StoredNote = {
  id: string;
  lessonId: string | null;
  title: string;
  body: string;
  createdAt: string;
  updatedAt: string;
};

const lesson = {
  id: 'generics',
  chapterId: 'intermediate',
  order: 8,
  title: 'ジェネリクス',
  summary: '',
  completed: false,
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
    http.get('*/api/lessons', () => HttpResponse.json({ lessons: [lesson] })),
    http.get('*/api/notes', ({ request }) => {
      lastQuery = new URL(request.url).searchParams;
      const q = lastQuery.get('q') ?? '';
      const items = notes.filter((note) => note.title.includes(q));
      return HttpResponse.json({
        items,
        page: 1,
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

describe('NotesPage', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  /** 画面を描画し、最初のノートが表示されるまで待ちます。 */
  async function renderNotes() {
    const screen = await renderWithProviders(<NotesPage />, { route: '/notes' });
    await expect.element(screen.getByRole('heading', { name: '型引数のメモ' })).toBeVisible();
    return screen;
  }

  it('ノートの一覧を表示する', async () => {
    const screen = await renderNotes();

    await expect.element(screen.getByText('T は型の引数')).toBeVisible();
    await expect
      .element(screen.getByRole('link', { name: 'ジェネリクス' }))
      .toHaveAttribute('href', '/lessons/generics');
  });

  it('新しいノートを作成すると一覧に追加される', async () => {
    const screen = await renderNotes();

    await screen.getByRole('button', { name: '新しいノート' }).click();
    await screen.getByLabelText('タイトル').fill('satisfies のメモ');
    await screen.getByLabelText('本文').fill('型を広げずに検査する');
    await screen.getByRole('button', { name: '保存する' }).click();

    await expect.element(screen.getByRole('heading', { name: 'satisfies のメモ' })).toBeVisible();
    // 保存に成功したらフォームが閉じる
    await expect.element(screen.getByLabelText('タイトル')).not.toBeInTheDocument();
  });

  it('タイトルが空なら保存せず、エラーを表示する', async () => {
    const screen = await renderNotes();

    await screen.getByRole('button', { name: '新しいノート' }).click();
    await screen.getByRole('button', { name: '保存する' }).click();

    await expect.element(screen.getByText('タイトルを入力してください')).toBeVisible();
    expect(notes).toHaveLength(1);
  });

  it('検索語を API に渡し、結果がなければその旨を表示する', async () => {
    const screen = await renderNotes();

    await screen.getByRole('searchbox', { name: 'ノートを検索' }).fill('存在しない');
    await screen.getByRole('button', { name: '検索' }).click();

    await expect.element(screen.getByText('条件に一致するノートはありません。')).toBeVisible();
    expect(lastQuery.get('q')).toBe('存在しない');
  });

  it('確認ダイアログで OK すると削除する', async () => {
    // 本物のブラウザの確認ダイアログは操作を止めてしまうので、「OK」を返す偽物に差し替えます。
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    const screen = await renderNotes();
    const card = screen.getByRole('listitem').filter({ hasText: '型引数のメモ' });

    await card.getByRole('button', { name: '削除' }).click();

    await expect
      .element(screen.getByRole('heading', { name: '型引数のメモ' }))
      .not.toBeInTheDocument();
  });
});
