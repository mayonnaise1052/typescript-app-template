import { Checkbox as BaseCheckbox } from '@base-ui/react/checkbox';
import { Check } from 'lucide-react';
import type { ComponentProps } from 'react';
import { cn } from '../../lib/utils';

/** チェックボックス。Base UI が <button role="checkbox"> として描画します。 */
export function Checkbox({ className, ...props }: ComponentProps<typeof BaseCheckbox.Root>) {
  return (
    <BaseCheckbox.Root
      className={cn(
        'mt-0.5 flex size-4 shrink-0 cursor-pointer items-center justify-center rounded-sm border border-input bg-card text-primary-foreground data-checked:border-primary data-checked:bg-primary data-disabled:cursor-not-allowed',
        className,
      )}
      {...props}
    >
      <BaseCheckbox.Indicator className="data-unchecked:hidden">
        <Check className="size-3.5" strokeWidth={3} />
      </BaseCheckbox.Indicator>
    </BaseCheckbox.Root>
  );
}
