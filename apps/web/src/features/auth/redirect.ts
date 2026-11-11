/**
 * ログイン後の戻り先を決めます。
 *
 * 戻り先は React Router の location.state（unknown 型）から取り出すので、
 * 形を 1 つずつ確かめながら絞り込みます。また、外部サイトへ飛ばされないよう
 * （オープンリダイレクト対策）、アプリ内のパスだけを受け付けます。
 */
export function redirectTarget(state: unknown): string {
  if (typeof state === 'object' && state !== null && 'from' in state) {
    const { from } = state;
    if (typeof from === 'string' && from.startsWith('/') && !from.startsWith('//')) return from;
  }
  return '/';
}
