import { cva, type VariantProps } from 'class-variance-authority';
import type { ComponentProps } from 'react';
import { cn } from '../../lib/utils';

/**
 * ボタンの見た目の定義。
 *
 * `cva` は「バリエーション名 → クラス名」の対応表から、クラス名を組み立てる関数を作ります。
 * 下の `VariantProps<typeof buttonVariants>` で、`variant` に渡せる値
 * （'default' | 'primary' | 'ghost' | 'destructive'）が型として自動で導出されます。
 *
 * リンク（<Link>）をボタンの見た目にしたいときは、`className={buttonVariants({ ... })}` と使います。
 */
export const buttonVariants = cva(
  'inline-flex shrink-0 cursor-pointer items-center justify-center gap-2 rounded-md text-sm font-semibold whitespace-nowrap transition-colors disabled:pointer-events-none disabled:opacity-55 [&_svg]:size-4',
  {
    variants: {
      variant: {
        default: 'border bg-card text-foreground hover:border-primary hover:bg-accent/40',
        primary: 'bg-primary text-primary-foreground hover:bg-primary/90',
        ghost: 'font-medium text-muted-foreground hover:bg-muted hover:text-foreground',
        destructive: 'bg-destructive text-white hover:bg-destructive/90',
        'ghost-destructive': 'font-medium text-destructive hover:bg-destructive-soft',
      },
      size: {
        default: 'h-10 px-4',
        sm: 'h-8 px-3',
        icon: 'size-9',
      },
    },
    defaultVariants: { variant: 'default', size: 'default' },
  },
);

/** <button> が受け取れる属性すべて ＋ 見た目のバリエーション。 */
export type ButtonProps = ComponentProps<'button'> & VariantProps<typeof buttonVariants>;

export function Button({ className, variant, size, type = 'button', ...props }: ButtonProps) {
  // type の既定値を 'button' にして、フォームの中で意図せず送信されるのを防ぎます。
  return (
    <button type={type} className={cn(buttonVariants({ variant, size }), className)} {...props} />
  );
}
