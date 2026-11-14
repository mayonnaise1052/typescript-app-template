import { assertNever, type ContentBlock } from '@typequest/shared';
import { RichText } from '../../components/RichText';
import { CodeBlock } from '../../components/CodeBlock';
import { cn } from '../../lib/utils';

/**
 * レッスン本文のブロックを描画します。
 *
 * `block.type` で switch すると、各 case の中で block の型が絞り込まれます
 * （'code' の case では block.code に、'list' の case では block.items にアクセスできる）。
 * 新しい種類のブロックを追加して case を書き忘れると、default の assertNever が
 * コンパイルエラーになります。
 */
function Block({ block }: { block: ContentBlock }) {
  switch (block.type) {
    case 'heading':
      return <h2 className="mt-9 text-xl font-bold">{block.text}</h2>;
    case 'paragraph':
      return (
        <p>
          <RichText text={block.text} />
        </p>
      );
    case 'code':
      return (
        <figure>
          <CodeBlock code={block.code} />
          {block.caption && (
            <figcaption className="mt-1.5 text-sm text-muted-foreground">
              {block.caption}
            </figcaption>
          )}
        </figure>
      );
    case 'list':
      return (
        <ul className="list-disc space-y-1 pl-6">
          {block.items.map((item, index) => (
            <li key={index}>
              <RichText text={item} />
            </li>
          ))}
        </ul>
      );
    case 'callout':
      return (
        <aside
          className={cn(
            'rounded-r-lg border-l-4 px-4 py-3',
            block.tone === 'warning'
              ? 'border-l-amber-500 bg-warning-soft'
              : 'border-l-primary bg-accent',
          )}
        >
          <strong className="text-sm">{block.tone === 'warning' ? '注意' : 'ポイント'}</strong>
          <p className="mt-0.5">
            <RichText text={block.text} />
          </p>
        </aside>
      );
    default:
      return assertNever(block);
  }
}

export function ContentRenderer({ blocks }: { blocks: readonly ContentBlock[] }) {
  return (
    <div className="space-y-4">
      {blocks.map((block, index) => (
        <Block key={index} block={block} />
      ))}
    </div>
  );
}
