/**
 * @typequest/shared — フロントエンドと API の両方から使う「共通の契約」。
 *
 * ここにある Zod スキーマが唯一の情報源（single source of truth）です。
 *   - API:   リクエストの検証に使う
 *   - Web:   フォーム入力の検証に使う
 *   - 両方:  z.infer で導出した型を使う
 */
export * from './brand';
export * from './errors';
export * from './result';
export * from './schemas/auth';
export * from './schemas/common';
export * from './schemas/lesson';
export * from './schemas/note';
export * from './schemas/package';
export * from './schemas/progress';
export * from './schemas/quiz';
