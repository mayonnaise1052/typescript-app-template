import { assertNever, type ContentBlock } from '@typequest/shared';
import { RichText } from '../../components/RichText';

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
      return <h2>{block.text}</h2>;
    case 'paragraph':
      return (
        <p>
          <RichText text={block.text} />
        </p>
      );
    case 'code':
      return (
        <figure className="code-block">
          <pre>
            <code>{block.code}</code>
          </pre>
          {block.caption && <figcaption>{block.caption}</figcaption>}
        </figure>
      );
    case 'list':
      return (
        <ul>
          {block.items.map((item, index) => (
            <li key={index}>
              <RichText text={item} />
            </li>
          ))}
        </ul>
      );
    case 'callout':
      return (
        <aside className={`callout ${block.tone}`}>
          <strong>{block.tone === 'warning' ? '注意' : 'ポイント'}</strong>
          <p>
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
    <div className="lesson-body">
      {blocks.map((block, index) => (
        <Block key={index} block={block} />
      ))}
    </div>
  );
}
