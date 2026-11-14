import type { ComponentProps } from 'react';
import { FieldError, FieldHint } from './Feedback';
import { Input, Label } from './ui/input';

/**
 * ラベル・入力欄・補足・エラー表示をまとめた部品。
 *
 * `ComponentProps<'input'>` は <input> が受け取れる全属性の型です。交差型（&）で独自の props を足し、
 * 残りは `...rest` でそのまま入力欄に渡します。React Hook Form の `register('email')` が返す
 * name / ref / onChange / onBlur も、この `...rest` を通って入力欄に届きます。
 */
type TextFieldProps = ComponentProps<'input'> & {
  label: string;
  name: string;
  error?: string | undefined;
  hint?: string;
};

export function TextField({ label, name, error, hint, ...rest }: TextFieldProps) {
  const errorId = `${name}-error`;
  const hintId = `${name}-hint`;
  // アクセシビリティ: エラーや補足を、入力欄と関連付けます。
  const describedBy = [error ? errorId : null, hint ? hintId : null].filter(Boolean).join(' ');

  return (
    <div className="grid gap-1.5">
      <Label htmlFor={name}>{label}</Label>
      <Input
        id={name}
        name={name}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy || undefined}
        {...rest}
      />
      {hint && <FieldHint id={hintId}>{hint}</FieldHint>}
      <FieldError id={errorId} message={error} />
    </div>
  );
}
