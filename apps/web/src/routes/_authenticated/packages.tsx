import { createFileRoute } from '@tanstack/react-router';
import { bookmarksQuery, PackagesPage } from '../../features/packages/PackagesPage';

export const Route = createFileRoute('/_authenticated/packages')({
  loader: ({ context: { queryClient } }) => queryClient.query(bookmarksQuery),
  component: PackagesPage,
});
