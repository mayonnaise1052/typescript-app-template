/**
 * 文章中の `バッククォート` で囲まれた部分を <code> として表示します。
 *
 * 文字列を HTML として挿入（dangerouslySetInnerHTML）せず、React の要素として組み立てるので、
 * 本文に <script> などが含まれていても、ただの文字として表示されます。
 */
export function RichText({ text }: { text: string }) {
  // '`' で分割すると、奇数番目の要素がバッククォートの内側になります。
  const parts = text.split('`');
  return (
    <>
      {parts.map((part, index) =>
        index % 2 === 1 ? <code key={index}>{part}</code> : <span key={index}>{part}</span>,
      )}
    </>
  );
}
