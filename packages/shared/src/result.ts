/**
 * Result 型: 「失敗するかもしれない処理」の結果を、例外ではなく戻り値で表します。
 *
 * `ok` プロパティを判別子（discriminant）にした判別可能ユニオンなので、
 * `if (result.ok)` で分岐すると、TypeScript が value / error のどちらを持つかを絞り込みます。
 *
 * 関連レッスン: discriminated-unions, async-and-result
 */
export type Ok<T> = { readonly ok: true; readonly value: T };
export type Err<E> = { readonly ok: false; readonly error: E };
export type Result<T, E> = Ok<T> | Err<E>;

export const ok = <T>(value: T): Ok<T> => ({ ok: true, value });
export const err = <E>(error: E): Err<E> => ({ ok: false, error });

/** 成功時の値だけを変換します。失敗はそのまま素通しします。 */
export function mapResult<T, U, E>(result: Result<T, E>, fn: (value: T) => U): Result<U, E> {
  return result.ok ? ok(fn(result.value)) : result;
}

/** 失敗時は代替値を返します。 */
export function unwrapOr<T, E>(result: Result<T, E>, fallback: T): T {
  return result.ok ? result.value : fallback;
}

/**
 * 網羅性チェック用のヘルパー。
 * switch 文ですべてのケースを処理していれば、ここに到達する値の型は `never` になります。
 * ケースを追加し忘れると、この呼び出しがコンパイルエラーになって気付けます。
 */
export function assertNever(value: never): never {
  throw new Error(`想定外の値です: ${JSON.stringify(value)}`);
}
