import type { ComponentProps } from 'react';
import { cn } from '../../lib/utils';

export const fieldControlClass =
  'w-full min-w-0 rounded-md border border-input bg-card px-3 py-2 text-base text-foreground placeholder:text-muted-foreground disabled:opacity-55 aria-invalid:border-destructive md:text-sm';

export function Input({ className, ...props }: ComponentProps<'input'>) {
  return <input className={cn(fieldControlClass, 'h-10', className)} {...props} />;
}

export function Textarea({ className, ...props }: ComponentProps<'textarea'>) {
  return <textarea className={cn(fieldControlClass, 'min-h-28 resize-y', className)} {...props} />;
}

/** ブラウザ標準の <select> を、入力欄と同じ見た目に整えたもの。 */
export function NativeSelect({ className, ...props }: ComponentProps<'select'>) {
  return <select className={cn(fieldControlClass, 'h-10 pr-8', className)} {...props} />;
}

export function Label({ className, ...props }: ComponentProps<'label'>) {
  // eslint の jsx-a11y は使っていないため、htmlFor は呼び出し側で必ず指定します。
  return <label className={cn('text-sm font-semibold', className)} {...props} />;
}
