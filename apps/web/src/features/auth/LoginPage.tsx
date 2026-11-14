import { zodResolver } from '@hookform/resolvers/zod';
import { Link, useRouter } from '@tanstack/react-router';
import { LoginInputSchema } from '@typequest/shared';
import { useForm } from 'react-hook-form';
import type { z } from 'zod';
import { ErrorMessage } from '../../components/Feedback';
import { TextField } from '../../components/TextField';
import { Button } from '../../components/ui/button';
import { Card, CardContent } from '../../components/ui/card';
import { applyServerErrors } from '../../lib/form';
import { useLogin } from './useAuth';

export function LoginPage() {
  const router = useRouter();
  const login = useLogin();

  /**
   * React Hook Form: 入力値・検証・送信中の状態をまとめて管理します。
   * 型引数は「入力中の値の型」「（未使用）」「検証後の値の型」で、どちらもスキーマから導出します。
   * zodResolver に API と同じスキーマを渡すので、画面と API で検証のルールが食い違いません。
   */
  const form = useForm<
    z.input<typeof LoginInputSchema>,
    unknown,
    z.output<typeof LoginInputSchema>
  >({
    resolver: zodResolver(LoginInputSchema),
    defaultValues: { email: '', password: '' },
  });
  const { errors } = form.formState;

  // handleSubmit は検証に通ったときだけ呼ばれ、values は検証・変換後の値（メールアドレスは小文字）です。
  const onSubmit = form.handleSubmit(async (values) => {
    try {
      await login.mutateAsync(values);
      // ログイン状態が変わったので、ルーターに「ログイン済みなら戻り先へ」の確認をやり直させます。
      await router.invalidate();
    } catch (error) {
      applyServerErrors(error, form.setError, ['email', 'password']);
    }
  });

  return (
    <>
      <h1 className="mb-6 text-center text-2xl font-bold">ログイン</h1>
      <Card>
        <CardContent>
          <form onSubmit={onSubmit} noValidate className="grid gap-4">
            {errors.root?.server && <ErrorMessage>{errors.root.server.message}</ErrorMessage>}
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
              autoComplete="current-password"
              error={errors.password?.message}
              {...form.register('password')}
            />
            <Button type="submit" variant="default" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting ? 'ログイン中…' : 'ログイン'}
            </Button>
          </form>
        </CardContent>
      </Card>
      <p className="mt-5 text-center text-muted-foreground">
        アカウントをお持ちでない方は{' '}
        <Link
          to="/register"
          search={(prev) => prev}
          className="text-primary underline underline-offset-4"
        >
          新規登録
        </Link>
      </p>
    </>
  );
}
