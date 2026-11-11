import {
  CreateNoteInputSchema,
  NOTE_BODY_MAX,
  NOTE_TITLE_MAX,
  type CreateNoteInput,
  type LessonSummary,
  type Note,
} from '@typequest/shared';
import { useState, type SubmitEvent } from 'react';
import type { z } from 'zod';
import { ErrorMessage, FieldError } from '../../components/Feedback';
import { TextField } from '../../components/TextField';
import { toFormErrors, validateForm, type FormErrors } from '../../lib/form';

/** 検証を通過した後の値の型（lessonId は必ず string | null になっている）。 */
export type NoteFormValues = z.infer<typeof CreateNoteInputSchema>;

type NoteFormProps = {
  /** 編集時は既存のノートを渡します。省略すると新規作成のフォームになります。 */
  initial?: Pick<Note, 'title' | 'body' | 'lessonId'>;
  lessons: readonly LessonSummary[];
  isSubmitting: boolean;
  submitError: unknown;
  onSubmit: (values: NoteFormValues) => void;
  onCancel: () => void;
};

export function NoteForm({
  initial,
  lessons,
  isSubmitting,
  submitError,
  onSubmit,
  onCancel,
}: NoteFormProps) {
  const [errors, setErrors] = useState<FormErrors<CreateNoteInput>>({});
  // サーバーから返ったエラーは、入力時のエラーがないときにだけ表示します。
  const serverErrors: FormErrors<CreateNoteInput> =
    submitError !== null && submitError !== undefined ? toFormErrors(submitError) : {};
  const shown = { ...serverErrors, ...errors };

  function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);

    // API と同じスキーマで検証します（packages/shared/src/schemas/note.ts）。
    const result = validateForm(CreateNoteInputSchema, {
      title: data.get('title'),
      body: data.get('body'),
      // 「指定しない」を選ぶと空文字が届くので、null に読み替えます。
      lessonId: data.get('lessonId') === '' ? null : data.get('lessonId'),
    });
    if (!result.ok) {
      setErrors(result.error);
      return;
    }
    setErrors({});
    onSubmit(result.value);
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="card form note-form">
      {shown._form && <ErrorMessage>{shown._form}</ErrorMessage>}
      <TextField
        label="タイトル"
        name="title"
        defaultValue={initial?.title}
        maxLength={NOTE_TITLE_MAX}
        error={shown.title}
      />
      <div className="field">
        <label htmlFor="body">本文</label>
        <textarea
          id="body"
          name="body"
          rows={5}
          defaultValue={initial?.body}
          maxLength={NOTE_BODY_MAX}
          aria-invalid={shown.body ? true : undefined}
          aria-describedby={shown.body ? 'body-error' : undefined}
        />
        <FieldError id="body-error" message={shown.body} />
      </div>
      <div className="field">
        <label htmlFor="lessonId">関連するレッスン（任意）</label>
        <select id="lessonId" name="lessonId" defaultValue={initial?.lessonId ?? ''}>
          <option value="">指定しない</option>
          {lessons.map((lesson) => (
            <option key={lesson.id} value={lesson.id}>
              {lesson.title}
            </option>
          ))}
        </select>
        <FieldError id="lessonId-error" message={shown.lessonId} />
      </div>
      <div className="form-actions">
        <button type="submit" className="button primary" disabled={isSubmitting}>
          {isSubmitting ? '保存中…' : '保存する'}
        </button>
        <button type="button" className="button ghost" onClick={onCancel}>
          キャンセル
        </button>
      </div>
    </form>
  );
}
