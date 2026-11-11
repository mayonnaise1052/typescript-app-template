import type { ReactNode } from 'react';
import { errorMessage } from '../lib/api';

export function Loading({ label = '読み込み中…' }: { label?: string }) {
  return (
    <p className="loading" role="status">
      {label}
    </p>
  );
}

export function ErrorMessage({ error, children }: { error?: unknown; children?: ReactNode }) {
  return (
    <p className="error-message" role="alert">
      {children ?? errorMessage(error)}
    </p>
  );
}

export function FieldError({ id, message }: { id: string; message: string | undefined }) {
  if (!message) return null;
  return (
    <p className="field-error" id={id}>
      {message}
    </p>
  );
}
