import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { beforeEach, describe, expect, it } from 'vitest';
import { server } from '../../test/server';
import { renderWithProviders } from '../../test/render';
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

  server.use(
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
  it('ノートの一覧を表示する', async () => {
    renderWithProviders(<NotesPage />, { route: '/notes' });

    expect(await screen.findByRole('heading', { name: '型引数のメモ' })).toBeInTheDocument();
    expect(screen.getByText('T は型の引数')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'ジェネリクス' })).toHaveAttribute(
      'href',
      '/lessons/generics',
    );
  });

  it('新しいノートを作成すると一覧に追加される', async () => {
    const user = userEvent.setup();
    renderWithProviders(<NotesPage />, { route: '/notes' });
    await screen.findByRole('heading', { name: '型引数のメモ' });

    await user.click(screen.getByRole('button', { name: '新しいノート' }));
    await user.type(screen.getByLabelText('タイトル'), 'satisfies のメモ');
    await user.type(screen.getByLabelText('本文'), '型を広げずに検査する');
    await user.click(screen.getByRole('button', { name: '保存する' }));

    expect(await screen.findByRole('heading', { name: 'satisfies のメモ' })).toBeInTheDocument();
    // 保存に成功したらフォームが閉じる
    expect(screen.queryByLabelText('タイトル')).not.toBeInTheDocument();
  });

  it('タイトルが空なら保存せず、エラーを表示する', async () => {
    const user = userEvent.setup();
    renderWithProviders(<NotesPage />, { route: '/notes' });
    await screen.findByRole('heading', { name: '型引数のメモ' });

    await user.click(screen.getByRole('button', { name: '新しいノート' }));
    await user.click(screen.getByRole('button', { name: '保存する' }));

    expect(await screen.findByText('タイトルを入力してください')).toBeInTheDocument();
    expect(notes).toHaveLength(1);
  });

  it('検索語を API に渡し、結果がなければその旨を表示する', async () => {
    const user = userEvent.setup();
    renderWithProviders(<NotesPage />, { route: '/notes' });
    await screen.findByRole('heading', { name: '型引数のメモ' });

    await user.type(screen.getByRole('searchbox', { name: 'ノートを検索' }), '存在しない');
    await user.click(screen.getByRole('button', { name: '検索' }));

    expect(await screen.findByText('条件に一致するノートはありません。')).toBeInTheDocument();
    expect(lastQuery.get('q')).toBe('存在しない');
  });

  it('確認ダイアログで OK すると削除する', async () => {
    const user = userEvent.setup();
    window.confirm = () => true;
    renderWithProviders(<NotesPage />, { route: '/notes' });
    const heading = await screen.findByRole('heading', { name: '型引数のメモ' });
    const card = heading.closest('li');
    if (!card) throw new Error('ノートのカードが見つかりません');

    await user.click(within(card).getByRole('button', { name: '削除' }));

    await waitFor(() =>
      expect(screen.queryByRole('heading', { name: '型引数のメモ' })).not.toBeInTheDocument(),
    );
  });
});
