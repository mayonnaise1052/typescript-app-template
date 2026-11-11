import { PASSWORD_MIN_LENGTH, RegisterInputSchema, type RegisterInput } from '@typequest/shared';
import { useState, type SubmitEvent } from 'react';
import { Link, useNavigate } from 'react-router';
import { ErrorMessage } from '../../components/Feedback';
import { TextField } from '../../components/TextField';
import { toFormErrors, validateForm, type FormErrors } from '../../lib/form';
import { useRegister } from './useAuth';

export function RegisterPage() {
  const navigate = useNavigate();
  const register = useRegister();
  const [errors, setErrors] = useState<FormErrors<RegisterInput>>({});

  function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    const values = Object.fromEntries(new FormData(event.currentTarget));

    const result = validateForm(RegisterInputSchema, values);
    if (!result.ok) {
      setErrors(result.error);
      return;
    }
    setErrors({});
    register.mutate(result.value, {
      onSuccess: () => void navigate('/', { replace: true }),
      onError: (error) => setErrors(toFormErrors(error)),
    });
  }

  return (
    <main className="auth-page">
      <h1>新規登録</h1>
      <form onSubmit={handleSubmit} noValidate className="card form">
        {errors._form && <ErrorMessage>{errors._form}</ErrorMessage>}
        <TextField
          label="表示名"
          name="displayName"
          autoComplete="nickname"
          error={errors.displayName}
        />
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
          autoComplete="new-password"
          hint={`${PASSWORD_MIN_LENGTH} 文字以上`}
          error={errors.password}
        />
        <button type="submit" className="button primary" disabled={register.isPending}>
          {register.isPending ? '登録中…' : '登録する'}
        </button>
      </form>
      <p className="auth-switch">
        すでにアカウントをお持ちの方は <Link to="/login">ログイン</Link>
      </p>
    </main>
  );
}
