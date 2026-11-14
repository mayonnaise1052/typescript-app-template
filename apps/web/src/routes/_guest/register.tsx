import { createFileRoute } from '@tanstack/react-router';
import { RegisterPage } from '../../features/auth/RegisterPage';

export const Route = createFileRoute('/_guest/register')({
  component: RegisterPage,
});
