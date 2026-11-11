import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { CreateNoteInput, UpdateNoteInput } from '@typequest/shared';
import { api, unwrap } from '../../lib/api';
import { queryKeys } from '../../lib/query';

export const NOTES_PAGE_SIZE = 5;

export type NoteListParams = { page: number; q: string; lessonId: string };

export function useNotes(params: NoteListParams) {
  return useQuery({
    queryKey: queryKeys.notes(params),
    queryFn: () =>
      unwrap(
        api.notes.$get({
          query: {
            page: String(params.page),
            pageSize: String(NOTES_PAGE_SIZE),
            // 空文字のときはキー自体を送りません。
            ...(params.q && { q: params.q }),
            ...(params.lessonId && { lessonId: params.lessonId }),
          },
        }),
      ),
    // ページを切り替える間、前のページを表示したままにして画面のちらつきを防ぎます。
    placeholderData: keepPreviousData,
  });
}

/** ノートを変更したら、一覧のキャッシュをすべて取り直させます。 */
function useInvalidateNotes() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: queryKeys.allNotes });
}

export function useCreateNote() {
  const invalidate = useInvalidateNotes();
  return useMutation({
    mutationFn: (input: CreateNoteInput) => unwrap(api.notes.$post({ json: input })),
    onSuccess: invalidate,
  });
}

export function useUpdateNote() {
  const invalidate = useInvalidateNotes();
  return useMutation({
    mutationFn: ({ noteId, input }: { noteId: string; input: UpdateNoteInput }) =>
      unwrap(api.notes[':noteId'].$patch({ param: { noteId }, json: input })),
    onSuccess: invalidate,
  });
}

export function useDeleteNote() {
  const invalidate = useInvalidateNotes();
  return useMutation({
    mutationFn: (noteId: string) => unwrap(api.notes[':noteId'].$delete({ param: { noteId } })),
    onSuccess: invalidate,
  });
}
