import { createFileRoute } from '@tanstack/react-router';
import { LessonListPage } from '../../../features/lessons/LessonListPage';
import { lessonsQuery } from '../../../features/lessons/queries';

export const Route = createFileRoute('/_authenticated/lessons/')({
  loader: ({ context: { queryClient } }) => queryClient.query(lessonsQuery),
  component: LessonListPage,
});
