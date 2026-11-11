import type { ComponentPropsWithoutRef } from 'react';
import { FieldError } from './Feedback';

/**
 * ラベル・入力欄・エラー表示をまとめた部品。
 *
 * `ComponentPropsWithoutRef<'input'>` は <input> が受け取れる全属性の型です。
 * 交差型（&）で独自の props を足し、残りは `...rest` でそのまま <input> に渡します。
 */
type TextFieldProps = ComponentPropsWithoutRef<'input'> & {
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
    <div className="field">
      <label htmlFor={name}>{label}</label>
      <input
        id={name}
        name={name}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy || undefined}
        {...rest}
      />
      {hint && (
        <p className="field-hint" id={hintId}>
          {hint}
        </p>
      )}
      <FieldError id={errorId} message={error} />
    </div>
  );
}
