import { zodResolver } from '@hookform/resolvers/zod';
import { Link, useRouter } from '@tanstack/react-router';
import { PASSWORD_MIN_LENGTH, RegisterInputSchema } from '@typequest/shared';
import { useForm } from 'react-hook-form';
import type { z } from 'zod';
import { ErrorMessage } from '../../components/Feedback';
import { TextField } from '../../components/TextField';
import { Button } from '../../components/ui/button';
import { Card } from '../../components/ui/card';
import { applyServerErrors } from '../../lib/form';
import { useRegister } from './useAuth';

type RegisterValues = z.input<typeof RegisterInputSchema>;

export function RegisterPage() {
  const router = useRouter();
  const register = useRegister();
  const form = useForm<RegisterValues, unknown, z.output<typeof RegisterInputSchema>>({
    resolver: zodResolver(RegisterInputSchema),
    defaultValues: { displayName: '', email: '', password: '' },
  });
  const { errors } = form.formState;

  const onSubmit = form.handleSubmit(async (values) => {
    try {
      await register.mutateAsync(values);
      await router.invalidate();
    } catch (error) {
      // 例: 登録済みのメールアドレス（409）は、フォーム全体のエラーとして表示されます。
      applyServerErrors(error, form.setError, ['displayName', 'email', 'password']);
    }
  });

  return (
    <>
      <h1 className="mb-6 text-center text-2xl font-bold">新規登録</h1>
      <Card>
        <form onSubmit={onSubmit} noValidate className="grid gap-4">
          {errors.root?.server && <ErrorMessage>{errors.root.server.message}</ErrorMessage>}
          <TextField
            label="表示名"
            autoComplete="nickname"
            error={errors.displayName?.message}
            {...form.register('displayName')}
          />
          <TextField
            label="メールアドレス"
            type="email"
            autoComplete="email"
            error={errors.email?.message}
            {...form.register('email')}
          />
          <TextField
            label="パスワード"
            type="password"
            autoComplete="new-password"
            hint={`${PASSWORD_MIN_LENGTH} 文字以上`}
            error={errors.password?.message}
            {...form.register('password')}
          />
          <Button type="submit" variant="primary" disabled={form.formState.isSubmitting}>
            {form.formState.isSubmitting ? '登録中…' : '登録する'}
          </Button>
        </form>
      </Card>
      <p className="mt-5 text-center text-muted-foreground">
        すでにアカウントをお持ちの方は{' '}
        <Link
          to="/login"
          search={(prev) => prev}
          className="text-primary underline underline-offset-4"
        >
          ログイン
        </Link>
      </p>
    </>
  );
}
