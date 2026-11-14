import type { ReactNode } from 'react';
import { errorMessage } from '../lib/api';
import { cn } from '../lib/utils';

export function Loading({ label = '読み込み中…' }: { label?: string }) {
  return (
    <p className="py-6 text-muted-foreground" role="status">
      {label}
    </p>
  );
}

export function ErrorMessage({
  error,
  children,
  className,
}: {
  error?: unknown;
  children?: ReactNode;
  className?: string;
}) {
  return (
    <p
      className={cn('rounded-md bg-destructive-soft px-3.5 py-2.5 text-destructive', className)}
      role="alert"
    >
      {children ?? errorMessage(error)}
    </p>
  );
}

export function FieldError({ id, message }: { id: string; message: string | undefined }) {
  if (!message) return null;
  return (
    <p className="text-sm text-destructive" id={id}>
      {message}
    </p>
  );
}

export function FieldHint({ id, children }: { id: string; children: ReactNode }) {
  return (
    <p className="text-sm text-muted-foreground" id={id}>
      {children}
    </p>
  );
}

export function EmptyState({ children }: { children: ReactNode }) {
  return <p className="py-4 text-muted-foreground">{children}</p>;
}
