import { cn } from '../lib/utils';

/** コードの表示。長い行は横にスクロールします（ページ全体は横にはみ出さない）。 */
export function CodeBlock({ code, className }: { code: string; className?: string }) {
  return (
    <pre
      className={cn(
        'overflow-x-auto rounded-lg bg-code p-4 font-mono text-sm leading-relaxed text-code-foreground [tab-size:2]',
        className,
      )}
    >
      <code>{code}</code>
    </pre>
  );
}
