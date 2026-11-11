import { LoginInputSchema, type LoginInput } from '@typequest/shared';
import { useState, type SubmitEvent } from 'react';
import { Link, useLocation, useNavigate } from 'react-router';
import { ErrorMessage } from '../../components/Feedback';
import { TextField } from '../../components/TextField';
import { toFormErrors, validateForm, type FormErrors } from '../../lib/form';
import { redirectTarget } from './redirect';
import { useLogin } from './useAuth';

export function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const login = useLogin();
  const [errors, setErrors] = useState<FormErrors<LoginInput>>({});

  function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    const values = Object.fromEntries(new FormData(event.currentTarget));

    const result = validateForm(LoginInputSchema, values);
    if (!result.ok) {
      setErrors(result.error);
      return;
    }
    setErrors({});
    login.mutate(result.value, {
      onSuccess: () => void navigate(redirectTarget(location.state), { replace: true }),
      onError: (error) => setErrors(toFormErrors(error)),
    });
  }

  return (
    <main className="auth-page">
      <h1>ログイン</h1>
      <form onSubmit={handleSubmit} noValidate className="card form">
        {errors._form && <ErrorMessage>{errors._form}</ErrorMessage>}
        <TextField
          label="メールアドレス"
          name="email"
          type="email"
          autoComplete="email"
          error={errors.email}
        />
        <TextField
          label="パスワード"
          name="password"
          type="password"
          autoComplete="current-password"
          error={errors.password}
        />
        <button type="submit" className="button primary" disabled={login.isPending}>
          {login.isPending ? 'ログイン中…' : 'ログイン'}
        </button>
      </form>
      <p className="auth-switch">
        アカウントをお持ちでない方は <Link to="/register">新規登録</Link>
      </p>
    </main>
  );
}
