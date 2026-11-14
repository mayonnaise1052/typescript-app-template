import { createFileRoute, stripSearchParams } from '@tanstack/react-router';
import { lessonsQuery } from '../../features/lessons/queries';
import { NotesPage } from '../../features/notes/NotesPage';
import { NotesSearchSchema } from '../../features/notes/search';

export const Route = createFileRoute('/_authenticated/notes')({
  // 検索条件をスキーマで検証します。画面は型の付いた値（page: number など）を受け取ります。
  validateSearch: NotesSearchSchema,
  // 既定値と同じ検索条件は URL に書きません（/notes?page=1&q= ではなく /notes）。
  search: { middlewares: [stripSearchParams({ page: 1, q: '' })] },
  loader: ({ context: { queryClient } }) => queryClient.query(lessonsQuery),
  component: function NotesRoute() {
    const search = Route.useSearch();
    return <NotesPage search={search} />;
  },
});
