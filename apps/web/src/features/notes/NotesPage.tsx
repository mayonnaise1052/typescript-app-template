import type { Note } from '@typequest/shared';
import { useState, type SubmitEvent } from 'react';
import { Link, useSearchParams } from 'react-router';
import { ErrorMessage, Loading } from '../../components/Feedback';
import { formatDateTime } from '../../lib/format';
import { useLessons } from '../lessons/queries';
import { NoteForm } from './NoteForm';
import { useCreateNote, useDeleteNote, useNotes, useUpdateNote } from './queries';

/**
 * 画面の「モード」を判別可能ユニオンで表します。
 * `isCreating` と `editingId` を別々の state にすると「作成中かつ編集中」という
 * あり得ない状態を作れてしまいますが、この形ならそもそも表現できません。
 */
type Mode = { type: 'list' } | { type: 'create' } | { type: 'edit'; noteId: string };

export function NotesPage() {
  // 検索条件を URL に持たせると、再読み込みや URL の共有でも同じ表示になります。
  const [searchParams, setSearchParams] = useSearchParams();
  const params = {
    q: searchParams.get('q') ?? '',
    lessonId: searchParams.get('lessonId') ?? '',
    page: Math.max(1, Number(searchParams.get('page')) || 1),
  };

  const [mode, setMode] = useState<Mode>({ type: 'list' });
  const notes = useNotes(params);
  // 絞り込み用のレッスン一覧は表示に必須なので Suspense で待ちます。
  // ノート一覧は検索やページ送りのたびに条件が変わるので、従来どおりその場で読み込み中を表示します。
  const { data: lessonList } = useLessons();
  const createNote = useCreateNote();
  const updateNote = useUpdateNote();
  const deleteNote = useDeleteNote();

  function updateParams(changes: Partial<Record<'q' | 'lessonId' | 'page', string>>) {
    const next = new URLSearchParams(searchParams);
    for (const [key, value] of Object.entries(changes)) {
      if (value) next.set(key, value);
      else next.delete(key);
    }
    setSearchParams(next);
  }

  function handleSearch(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    const q = new FormData(event.currentTarget).get('q');
    updateParams({ q: typeof q === 'string' ? q.trim() : '', page: '' });
  }

  function handleDelete(note: Note) {
    if (window.confirm(`「${note.title}」を削除しますか？`)) deleteNote.mutate(note.id);
  }

  const closeForm = () => {
    createNote.reset();
    updateNote.reset();
    setMode({ type: 'list' });
  };

  const lessonTitle = (id: string | null) => lessonList.find((lesson) => lesson.id === id)?.title;

  return (
    <>
      <div className="page-heading">
        <h1>ノート</h1>
        {mode.type === 'list' && (
          <button
            type="button"
            className="button primary"
            onClick={() => setMode({ type: 'create' })}
          >
            新しいノート
          </button>
        )}
      </div>

      {mode.type === 'create' && (
        <NoteForm
          initial={{ title: '', body: '', lessonId: (params.lessonId || null) as Note['lessonId'] }}
          lessons={lessonList}
          isSubmitting={createNote.isPending}
          submitError={createNote.error}
          onSubmit={(values) => createNote.mutate(values, { onSuccess: closeForm })}
          onCancel={closeForm}
        />
      )}

      <form onSubmit={handleSearch} className="toolbar" role="search">
        <label className="visually-hidden" htmlFor="note-search">
          ノートを検索
        </label>
        <input
          id="note-search"
          name="q"
          type="search"
          placeholder="タイトルや本文で検索"
          defaultValue={params.q}
          key={params.q}
          maxLength={100}
        />
        <button type="submit" className="button">
          検索
        </button>
        <label className="visually-hidden" htmlFor="note-lesson-filter">
          レッスンで絞り込む
        </label>
        <select
          id="note-lesson-filter"
          value={params.lessonId}
          onChange={(event) => updateParams({ lessonId: event.target.value, page: '' })}
        >
          <option value="">すべてのレッスン</option>
          {lessonList.map((lesson) => (
            <option key={lesson.id} value={lesson.id}>
              {lesson.title}
            </option>
          ))}
        </select>
      </form>

      {deleteNote.error && <ErrorMessage error={deleteNote.error} />}

      {notes.isPending ? (
        <Loading />
      ) : notes.error ? (
        <ErrorMessage error={notes.error} />
      ) : notes.data.items.length === 0 ? (
        <p className="empty">
          {params.q || params.lessonId
            ? '条件に一致するノートはありません。'
            : 'まだノートがありません。学んだことを書き留めておきましょう。'}
        </p>
      ) : (
        <>
          <ul className="note-list">
            {notes.data.items.map((note) =>
              mode.type === 'edit' && mode.noteId === note.id ? (
                <li key={note.id}>
                  <NoteForm
                    initial={note}
                    lessons={lessonList}
                    isSubmitting={updateNote.isPending}
                    submitError={updateNote.error}
                    onSubmit={(values) =>
                      updateNote.mutate(
                        { noteId: note.id, input: values },
                        { onSuccess: closeForm },
                      )
                    }
                    onCancel={closeForm}
                  />
                </li>
              ) : (
                <li key={note.id} className="card note">
                  <div className="note-header">
                    <h2>{note.title}</h2>
                    <div className="note-actions">
                      <button
                        type="button"
                        className="button ghost"
                        onClick={() => setMode({ type: 'edit', noteId: note.id })}
                      >
                        編集
                      </button>
                      <button
                        type="button"
                        className="button ghost danger"
                        disabled={deleteNote.isPending}
                        onClick={() => handleDelete(note)}
                      >
                        削除
                      </button>
                    </div>
                  </div>
                  <p className="note-body">{note.body}</p>
                  <p className="note-meta">
                    {note.lessonId && (
                      <Link to={`/lessons/${note.lessonId}`}>
                        {lessonTitle(note.lessonId) ?? note.lessonId}
                      </Link>
                    )}
                    <span>更新: {formatDateTime(note.updatedAt)}</span>
                  </p>
                </li>
              ),
            )}
          </ul>

          <nav className="pagination" aria-label="ページ送り">
            <button
              type="button"
              className="button"
              disabled={notes.data.page <= 1}
              onClick={() => updateParams({ page: String(notes.data.page - 1) })}
            >
              前へ
            </button>
            <span>
              {notes.data.page} / {notes.data.totalPages} ページ（全 {notes.data.totalItems} 件）
            </span>
            <button
              type="button"
              className="button"
              disabled={notes.data.page >= notes.data.totalPages}
              onClick={() => updateParams({ page: String(notes.data.page + 1) })}
            >
              次へ
            </button>
          </nav>
        </>
      )}
    </>
  );
}
