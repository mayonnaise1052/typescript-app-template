import { zodResolver } from '@hookform/resolvers/zod';
import {
  CreateNoteInputSchema,
  NOTE_BODY_MAX,
  NOTE_TITLE_MAX,
  type LessonSummary,
  type Note,
} from '@typequest/shared';
import { useForm } from 'react-hook-form';
import type { z } from 'zod';
import { ErrorMessage, FieldError } from '../../components/Feedback';
import { TextField } from '../../components/TextField';
import { Button } from '../../components/ui/button';
import { Card } from '../../components/ui/card';
import { Label, NativeSelect, Textarea } from '../../components/ui/input';
import { applyServerErrors } from '../../lib/form';

/** 入力中の値の型（lessonId は省略できる）と、検証後の値の型（lessonId は string | null）。 */
type NoteFormInput = z.input<typeof CreateNoteInputSchema>;
export type NoteFormValues = z.output<typeof CreateNoteInputSchema>;

type NoteFormProps = {
  /** 編集時は既存のノートを渡します。省略すると新規作成のフォームになります。 */
  initial?: Pick<Note, 'title' | 'body' | 'lessonId'>;
  lessons: readonly LessonSummary[];
  /** 保存の処理。失敗したら例外を投げてください（API のエラーを各入力欄に表示します）。 */
  onSubmit: (values: NoteFormValues) => Promise<void>;
  onCancel: () => void;
};

export function NoteForm({ initial, lessons, onSubmit, onCancel }: NoteFormProps) {
  // API と同じスキーマで検証します（packages/shared/src/schemas/note.ts）。
  const form = useForm<NoteFormInput, unknown, NoteFormValues>({
    resolver: zodResolver(CreateNoteInputSchema),
    defaultValues: {
      title: initial?.title ?? '',
      body: initial?.body ?? '',
      lessonId: initial?.lessonId ?? null,
    },
  });
  const { errors, isSubmitting } = form.formState;

  const submit = form.handleSubmit(async (values) => {
    try {
      await onSubmit(values);
    } catch (error) {
      // 例: 存在しないレッスン → 「関連するレッスン」の欄にエラーを表示します。
      applyServerErrors(error, form.setError, ['title', 'body', 'lessonId']);
    }
  });

  return (
    <Card className="mb-6">
      <form onSubmit={submit} noValidate className="grid gap-4">
        {errors.root?.server && <ErrorMessage>{errors.root.server.message}</ErrorMessage>}
        <TextField
          label="タイトル"
          maxLength={NOTE_TITLE_MAX}
          error={errors.title?.message}
          {...form.register('title')}
        />
        <div className="grid gap-1.5">
          <Label htmlFor="body">本文</Label>
          <Textarea
            id="body"
            rows={5}
            maxLength={NOTE_BODY_MAX}
            aria-invalid={errors.body ? true : undefined}
            aria-describedby={errors.body ? 'body-error' : undefined}
            {...form.register('body')}
          />
          <FieldError id="body-error" message={errors.body?.message} />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="lessonId">関連するレッスン（任意）</Label>
          <NativeSelect
            id="lessonId"
            aria-invalid={errors.lessonId ? true : undefined}
            aria-describedby={errors.lessonId ? 'lessonId-error' : undefined}
            // 「指定しない」は空文字で届くので、送信前に null へ読み替えます。
            {...form.register('lessonId', {
              setValueAs: (value: string) => (value === '' ? null : value),
            })}
          >
            <option value="">指定しない</option>
            {lessons.map((lesson) => (
              <option key={lesson.id} value={lesson.id}>
                {lesson.title}
              </option>
            ))}
          </NativeSelect>
          <FieldError id="lessonId-error" message={errors.lessonId?.message} />
        </div>
        <div className="flex gap-2">
          <Button type="submit" variant="primary" disabled={isSubmitting}>
            {isSubmitting ? '保存中…' : '保存する'}
          </Button>
          <Button variant="ghost" onClick={onCancel}>
            キャンセル
          </Button>
        </div>
      </form>
    </Card>
  );
}
