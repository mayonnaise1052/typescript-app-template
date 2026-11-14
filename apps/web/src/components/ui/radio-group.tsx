import { Radio } from '@base-ui/react/radio';
import { RadioGroup as BaseRadioGroup } from '@base-ui/react/radio-group';
import type { ComponentProps } from 'react';
import { cn } from '../../lib/utils';

export function RadioGroup({ className, ...props }: ComponentProps<typeof BaseRadioGroup>) {
  return <BaseRadioGroup className={cn('grid gap-2', className)} {...props} />;
}

/**
 * ラジオボタン。Base UI は <button role="radio"> として描画し、矢印キーでの移動や
 * aria-checked の更新を受け持ちます。<label> で包むと、文字をクリックしても選択できます。
 */
export function RadioGroupItem({ className, ...props }: ComponentProps<typeof Radio.Root>) {
  return (
    <Radio.Root
      className={cn(
        'mt-0.5 flex size-4 shrink-0 cursor-pointer items-center justify-center rounded-full border border-input bg-card data-checked:border-primary data-disabled:cursor-not-allowed',
        className,
      )}
      {...props}
    >
      <Radio.Indicator className="size-2 rounded-full bg-primary data-unchecked:hidden" />
    </Radio.Root>
  );
}
