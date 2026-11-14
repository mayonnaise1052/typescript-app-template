import { Link, useNavigate } from '@tanstack/react-router';
import type { Note } from '@typequest/shared';
import { useState, type SubmitEvent } from 'react';
import { toast } from '../../components/ui/toast';
import { EmptyState, ErrorMessage, Loading } from '../../components/Feedback';
import { ConfirmDialog } from '../../components/ui/alert-dialog';
import { Button } from '../../components/ui/button';
import { Card } from '../../components/ui/card';
import { Input, NativeSelect } from '../../components/ui/input';
import { formatDateTime } from '../../lib/format';
import { useLessons } from '../lessons/queries';
import { NoteForm, type NoteFormValues } from './NoteForm';
import { useCreateNote, useDeleteNote, useNotes, useUpdateNote } from './queries';
import type { NotesSearch } from './search';

/**
 * 画面の「モード」を判別可能ユニオンで表します。
 * `isCreating` と `editingId` を別々の state にすると「作成中かつ編集中」という
 * あり得ない状態を作れてしまいますが、この形ならそもそも表現できません。
 */
type Mode = { type: 'list' } | { type: 'create' } | { type: 'edit'; noteId: string };

/**
 * ノートの画面。検索条件（search）はルートでスキーマ検証済みで、型が付いています
 * （page は 1 以上の number、q は string）。URL を手で書き換えても、ここには正しい値しか届きません。
 */
export function NotesPage({ search }: { search: NotesSearch }) {
  const navigate = useNavigate({ from: '/notes' });
  const [mode, setMode] = useState<Mode>({ type: 'list' });
  const notes = useNotes(search);
  // 絞り込み用のレッスン一覧は表示に必須なので Suspense で待ちます（ルートの loader が先に取得済み）。
  // ノート一覧は検索やページ送りのたびに条件が変わるので、従来どおりその場で読み込み中を表示します。
  const { data: lessonList } = useLessons();
  const createNote = useCreateNote();
  const updateNote = useUpdateNote();
  const deleteNote = useDeleteNote();

  /**
   * 検索条件だけを変えます。`search` に関数を渡すと、今の値（型付き）を受け取って新しい値を返せます。
   * 同じ画面の中での移動なので、スクロール位置はそのままにします（resetScroll: false）。
   */
  function updateSearch(changes: Partial<NotesSearch>) {
    void navigate({ search: (prev) => ({ ...prev, ...changes }), resetScroll: false });
  }

  function handleSearch(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    const q = new FormData(event.currentTarget).get('q');
    updateSearch({ q: typeof q === 'string' ? q.trim() : '', page: 1 });
  }

  async function create(values: NoteFormValues) {
    await createNote.mutateAsync(values);
    toast.success('ノートを保存しました');
    setMode({ type: 'list' });
  }

  async function update(noteId: string, values: NoteFormValues) {
    await updateNote.mutateAsync({ noteId, input: values });
    toast.success('ノートを更新しました');
    setMode({ type: 'list' });
  }

  function remove(note: Note) {
    deleteNote.mutate(note.id, {
      onSuccess: () => toast.success(`「${note.title}」を削除しました`),
      onError: () => toast.error('削除できませんでした'),
    });
  }

  const lessonTitle = (id: string | null) => lessonList.find((lesson) => lesson.id === id)?.title;
  const closeForm = () => setMode({ type: 'list' });

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-3xl font-bold">ノート</h1>
        {mode.type === 'list' && (
          <Button variant="primary" onClick={() => setMode({ type: 'create' })}>
            新しいノート
          </Button>
        )}
      </div>

      {mode.type === 'create' && (
        <NoteForm
          initial={{ title: '', body: '', lessonId: search.lessonId ?? null }}
          lessons={lessonList}
          onSubmit={create}
          onCancel={closeForm}
        />
      )}

      <form onSubmit={handleSearch} className="mb-5 flex flex-wrap gap-2" role="search">
        <label className="sr-only" htmlFor="note-search">
          ノートを検索
        </label>
        <Input
          id="note-search"
          name="q"
          type="search"
          placeholder="タイトルや本文で検索"
          defaultValue={search.q}
          key={search.q}
          maxLength={100}
          className="w-auto flex-[1_1_14rem]"
        />
        <Button type="submit">検索</Button>
        <label className="sr-only" htmlFor="note-lesson-filter">
          レッスンで絞り込む
        </label>
        <NativeSelect
          id="note-lesson-filter"
          value={search.lessonId ?? ''}
          onChange={(event) => {
            const lesson = lessonList.find((candidate) => candidate.id === event.target.value);
            updateSearch({ lessonId: lesson?.id, page: 1 });
          }}
          className="w-auto flex-[0_1_14rem]"
        >
          <option value="">すべてのレッスン</option>
          {lessonList.map((lesson) => (
            <option key={lesson.id} value={lesson.id}>
              {lesson.title}
            </option>
          ))}
        </NativeSelect>
      </form>

      {notes.isPending ? (
        <Loading />
      ) : notes.error ? (
        <ErrorMessage error={notes.error} />
      ) : notes.data.items.length === 0 ? (
        <EmptyState>
          {search.q || search.lessonId
            ? '条件に一致するノートはありません。'
            : 'まだノートがありません。学んだことを書き留めておきましょう。'}
        </EmptyState>
      ) : (
        <>
          <ul className="grid gap-3">
            {notes.data.items.map((note) =>
              mode.type === 'edit' && mode.noteId === note.id ? (
                <li key={note.id}>
                  <NoteForm
                    initial={note}
                    lessons={lessonList}
                    onSubmit={(values) => update(note.id, values)}
                    onCancel={closeForm}
                  />
                </li>
              ) : (
                <li key={note.id}>
                  <Card>
                    <div className="flex items-start justify-between gap-4">
                      <h2 className="text-lg font-bold [overflow-wrap:anywhere]">{note.title}</h2>
                      <div className="flex shrink-0">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setMode({ type: 'edit', noteId: note.id })}
                        >
                          編集
                        </Button>
                        <ConfirmDialog
                          trigger={
                            <Button
                              variant="ghost-destructive"
                              size="sm"
                              disabled={deleteNote.isPending}
                            >
                              削除
                            </Button>
                          }
                          title="ノートを削除しますか？"
                          description={`「${note.title}」を削除します。この操作は取り消せません。`}
                          confirmLabel="削除する"
                          onConfirm={() => remove(note)}
                        />
                      </div>
                    </div>
                    <p className="my-2 whitespace-pre-wrap [overflow-wrap:anywhere]">{note.body}</p>
                    <p className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
                      {note.lessonId && (
                        <Link
                          to="/lessons/$lessonId"
                          params={{ lessonId: note.lessonId }}
                          className="text-primary underline-offset-4 hover:underline"
                        >
                          {lessonTitle(note.lessonId) ?? note.lessonId}
                        </Link>
                      )}
                      <span>更新: {formatDateTime(note.updatedAt)}</span>
                    </p>
                  </Card>
                </li>
              ),
            )}
          </ul>

          <nav
            className="mt-6 flex flex-wrap items-center justify-center gap-4 text-sm text-muted-foreground"
            aria-label="ページ送り"
          >
            <Button
              disabled={notes.data.page <= 1}
              onClick={() => updateSearch({ page: notes.data.page - 1 })}
            >
              前へ
            </Button>
            <span className="tabular-nums">
              {notes.data.page} / {notes.data.totalPages} ページ（全 {notes.data.totalItems} 件）
            </span>
            <Button
              disabled={notes.data.page >= notes.data.totalPages}
              onClick={() => updateSearch({ page: notes.data.page + 1 })}
            >
              次へ
            </Button>
          </nav>
        </>
      )}
    </>
  );
}
