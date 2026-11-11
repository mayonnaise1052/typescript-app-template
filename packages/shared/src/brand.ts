/**
 * Branded Types（公称型のエミュレーション）
 *
 * TypeScript は「構造的型付け」なので、`UserId` も `LessonId` もただの string だと
 * 取り違えてもコンパイルエラーになりません。実行時には存在しない「目印」プロパティを
 * 型にだけ付けることで、別物として区別させます。
 *
 * 関連レッスン: branded-types
 */
declare const brand: unique symbol;

export type Brand<T, Name extends string> = T & { readonly [brand]: Name };
