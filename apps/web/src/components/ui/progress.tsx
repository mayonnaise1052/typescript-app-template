import { Progress as BaseProgress } from '@base-ui/react/progress';
import { cn } from '../../lib/utils';

type ProgressProps = {
  value: number;
  max: number;
  label: string;
  className?: string;
};

/** 進み具合のバー。Base UI が role="progressbar" と aria-valuenow などを付けます。 */
export function Progress({ value, max, label, className }: ProgressProps) {
  return (
    <BaseProgress.Root
      value={value}
      max={max}
      aria-label={label}
      className={cn('w-full', className)}
    >
      <BaseProgress.Track className="h-2 overflow-hidden rounded-full bg-muted">
        <BaseProgress.Indicator className="rounded-full bg-primary transition-[width] duration-500" />
      </BaseProgress.Track>
    </BaseProgress.Root>
  );
}
