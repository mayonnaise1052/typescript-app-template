import { createFileRoute } from '@tanstack/react-router';
import { lessonsQuery } from '../../features/lessons/queries';
import { DashboardPage, progressQuery } from '../../features/progress/DashboardPage';

export const Route = createFileRoute('/_authenticated/')({
  // 画面に必要な 2 つのデータの取得を、描画より先に、並列に始めます。
  loader: ({ context: { queryClient } }) =>
    Promise.all([queryClient.query(progressQuery), queryClient.query(lessonsQuery)]),
  component: DashboardPage,
});
