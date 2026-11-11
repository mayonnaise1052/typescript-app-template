import { blank, code, h, info, list, multi, p, single, warn, type LessonContent } from './types';

export const practical: LessonContent[] = [
  {
    id: 'zod-inference',
    chapterId: 'practical',
    title: 'Zod とスキーマからの型推論',
    summary: '実行時の検証と TypeScript の型を、1 つの定義から得る方法。',
    body: [
      p(
        'TypeScript の型は実行時には消えます。そのため、API のリクエストやフォームの入力など「外から来る値」は、型を書いただけでは守れません。実行時に検証する必要があります。',
      ),
      h('スキーマを 1 つ書けば、検証と型の両方が手に入る'),
      code(`
import { z } from 'zod';

const CreateNoteInputSchema = z.object({
  title: z.string().trim().min(1).max(100),
  body: z.string().min(1).max(5000),
  lessonId: z.string().nullable().default(null),
});

type CreateNoteInput = z.infer<typeof CreateNoteInputSchema>;
// { title: string; body: string; lessonId: string | null }
`),
      p('型を別に手書きしないので、検証のルールと型がずれることがありません。'),
      h('parse と safeParse'),
      code(`
const input = CreateNoteInputSchema.parse(json);      // 失敗すると例外
const result = CreateNoteInputSchema.safeParse(json); // 失敗しても例外を投げない

if (result.success) {
  result.data.title;   // 検証済みの値
} else {
  result.error.issues; // どの項目がなぜ不正か
}
`),
      info('`safeParse` の戻り値は `success` を判別子にした判別可能ユニオンです。'),
      h('このアプリでの使い方'),
      list(
        'API: リクエストの body / query / パラメータを検証する',
        'フロント: 送信前にフォームの入力を検証する（API と同じスキーマ）',
        '外部 API の応答や環境変数も、スキーマで検証してから使う',
      ),
    ],
    codeRefs: [
      {
        path: 'packages/shared/src/schemas/note.ts',
        description: 'ノートのスキーマと、そこから導出した型',
      },
      {
        path: 'apps/api/src/routes/notes.ts',
        description: "`validate('json', CreateNoteInputSchema)` でリクエストを検証",
      },
      {
        path: 'apps/web/src/features/notes/NoteForm.tsx',
        description: '同じスキーマでフォームの入力を検証',
      },
    ],
    questions: [
      single(
        '型注釈だけでは API のリクエストを守れない理由はどれですか？',
        [
          '型注釈は遅いから',
          '型は実行時には存在せず、実際に届く値を検査できないから',
          'JSON には型を書けないから',
          'TypeScript は関数の引数を検査しないから',
        ],
        1,
        '型はコンパイル時の仕組みです。外部から届く値は、実行時に検証する必要があります。',
      ),
      blank(
        'スキーマから型を取り出すユーティリティを埋めてください。',
        `
const UserSchema = z.object({ id: z.string() });
type User = z.____<typeof UserSchema>;
`,
        ['infer'],
        '`z.infer<typeof スキーマ>` で、検証後の値の型を取り出せます。',
      ),
    ],
  },
  {
    id: 'async-and-result',
    chapterId: 'practical',
    title: 'async/await と Result 型によるエラー設計',
    summary: '非同期処理の型と、失敗を戻り値で表す設計。',
    body: [
      p('`async` 関数は必ず `Promise` を返します。`await` すると中身の値を取り出せます。'),
      code(`
async function fetchTitle(id: string): Promise<string> {
  const response = await fetch(\`/api/lessons/\${id}\`);
  const data: unknown = await response.json();
  // ... data を検証して返す
}
`),
      h('並列に実行する'),
      p(
        '互いに依存しない処理は `Promise.all` で同時に実行します。戻り値は、渡した順のタプルとして型が付きます。',
      ),
      code(`
const [lessons, completed] = await Promise.all([
  listLessons(),          // Promise<Lesson[]>
  listCompletedIds(user), // Promise<Set<string>>
]);
`),
      h('例外の問題点'),
      p(
        '`throw` された例外は、関数の型には現れません。呼び出す側は、その関数が何を投げるのかを型から知ることができず、処理を忘れても気付けません。また、catch した値の型は `unknown` です。',
      ),
      h('Result 型'),
      p(
        '「失敗するかもしれない」ことを戻り値の型で表すと、呼び出し側は成功か失敗かを確認しないと値を取り出せなくなります。',
      ),
      code(`
type Result<T, E> =
  | { ok: true; value: T }
  | { ok: false; error: E };

async function login(input: LoginInput): Promise<Result<Session, AppError>> { /* ... */ }

const result = await login(input);
if (!result.ok) {
  return showError(result.error.message);
}
result.value; // ここでは Session
`),
      info(
        'このアプリでは、想定内の失敗（入力の誤り、見つからない、など）は Result で返し、想定外の異常（DB に接続できない、など）だけを例外にしています。',
      ),
      warn(
        '`await` を付け忘れた Promise は、エラーが起きても誰にも捕捉されません。ESLint の `no-floating-promises` で検出できます。',
      ),
    ],
    codeRefs: [
      {
        path: 'packages/shared/src/result.ts',
        description: '`Result<T, E>` と補助関数',
      },
      {
        path: 'apps/api/src/services/auth-service.ts',
        description: '登録とログインが `Result<AuthSession, AppError>` を返している',
      },
      {
        path: 'apps/api/src/lib/unwrap.ts',
        description: 'Result を HTTP のエラー応答に変換する境界',
      },
      {
        path: 'apps/api/src/services/progress-service.ts',
        description: '5 つの問い合わせを `Promise.all` で並列に実行',
      },
    ],
    questions: [
      single(
        '`async function f(): Promise<number>` を `const x = f();` と await せずに呼んだとき、x の型はどれですか？',
        ['number', 'Promise<number>', 'undefined', 'never'],
        1,
        'async 関数の戻り値は Promise です。中身を取り出すには `await` が必要です。',
      ),
      multi(
        'Result 型を使う利点をすべて選んでください。',
        [
          '失敗の可能性が関数の型に現れる',
          '呼び出し側が失敗の処理を忘れるとコンパイルエラーになる',
          '実行速度が必ず速くなる',
          'エラーの種類に型が付く',
        ],
        [0, 1, 3],
        'Result は失敗を型で表現するための設計です。実行速度の改善を目的としたものではありません。',
      ),
    ],
  },
  {
    id: 'modules-and-tsconfig',
    chapterId: 'practical',
    title: 'モジュールと tsconfig',
    summary: 'ファイルの分け方、型だけの import、tsconfig の主要な設定。',
    body: [
      h('import と export'),
      code(`
// note-service.ts
export function createNoteService() { /* ... */ }
export type NoteService = ReturnType<typeof createNoteService>;

// 別のファイル
import { createNoteService } from './note-service';
import type { NoteService } from './note-service'; // 型だけの import
`),
      p(
        '`import type` は型だけを取り込み、出力される JavaScript からは完全に消えます。このアプリのフロントエンドは、API の型を `import type` で参照しています。サーバーのコードがブラウザ向けのファイルに混ざらないのは、このためです。',
      ),
      h('層に分ける'),
      p(
        'このアプリの API は、役割ごとに 3 層に分けています。依存の向きは常に上から下の一方向です。',
      ),
      list(
        '`routes/` … HTTP の入出力（検証して、サービスを呼び、JSON で返す）',
        '`services/` … ビジネスロジック（HTTP も SQL も知らない）',
        '`repositories/` … DB への問い合わせ',
      ),
      h('tsconfig の主な設定'),
      list(
        '`strict` … 厳格な型チェック一式を有効にする。必ず true にする',
        '`noUncheckedIndexedAccess` … 配列の添字アクセスに undefined を含める',
        '`lib` / `types` … 実行環境にある API の型（ブラウザなら DOM、Workers なら Workers 用の型）',
        '`moduleResolution` … import の解決方法。バンドラーを使うなら `bundler`',
        '`noEmit` … tsc を型チェック専用にする（変換は Vite などが行う）',
      ),
      info(
        'このアプリはブラウザ・Workers・Node の 3 つの環境で動くコードを含むため、共通の設定を `tsconfig.base.json` に置き、環境ごとの tsconfig が `extends` で継承しています。',
      ),
    ],
    codeRefs: [
      {
        path: 'tsconfig.base.json',
        description: '全パッケージ共通のコンパイラ設定',
      },
      {
        path: 'apps/web/src/lib/api.ts',
        description: '`import type { AppType }` で API の型だけを取り込んでいる',
      },
      {
        path: 'apps/api/src/services/index.ts',
        description: '層どうしの依存関係を 1 か所で組み立てている',
      },
    ],
    questions: [
      single(
        "`import type { X } from './x'` の特徴はどれですか？",
        [
          '実行時に ./x を遅延読み込みする',
          '型だけを取り込み、出力される JavaScript には残らない',
          'X を any として取り込む',
          'default export だけを取り込む',
        ],
        1,
        '`import type` はコンパイル時にだけ使われ、出力からは取り除かれます。',
      ),
      single(
        'このアプリの層構成で、SQL の問い合わせを書くべき場所はどれですか？',
        ['routes/', 'services/', 'repositories/', 'middleware/'],
        2,
        'DB へのアクセスは repositories 層に閉じ込めます。こうすると、DB を変更しても影響範囲が限定されます。',
      ),
    ],
  },
  {
    id: 'testing-types',
    chapterId: 'practical',
    title: 'テストと型のテスト',
    summary: 'テストの種類と書き方、そして「型そのもの」をテストする方法。',
    body: [
      p(
        '型チェックは「形の間違い」を防ぎますが、「ロジックの間違い」は防げません。両方を守るために、テストを書きます。',
      ),
      h('テストの種類'),
      list(
        '単体テスト … 関数 1 つを単独で確かめる。速く、原因を特定しやすい',
        '結合テスト … API を実際に呼び、DB を含めた動作を確かめる',
        'コンポーネントテスト … 画面の部品を、ユーザーの操作を通して確かめる',
        'E2E テスト … 実際のブラウザで、登録から学習までの一連の流れを確かめる',
      ),
      h('単体テストの基本形'),
      code(`
import { describe, expect, it } from 'vitest';
import { calculateStreak } from './streak';

describe('calculateStreak', () => {
  it('今日と昨日に学習していれば 2 を返す', () => {
    const now = new Date('2026-01-10T03:00:00Z');
    const dates = [new Date('2026-01-10T01:00:00Z'), new Date('2026-01-09T01:00:00Z')];

    expect(calculateStreak(dates, now)).toBe(2);
  });
});
`),
      p(
        '現在時刻や fetch のように「実行するたびに結果が変わるもの」は、引数で渡せるように設計しておくと、テストで値を固定できます。',
      ),
      h('型のテスト'),
      p(
        '複雑な型は、型自体が意図どおりかをテストできます。Vitest の `expectTypeOf` は、実行はせずコンパイル時の型だけを検査します。',
      ),
      code(`
import { expectTypeOf } from 'vitest';

expectTypeOf<UserId>().not.toEqualTypeOf<LessonId>();
expectTypeOf(ok(1)).toMatchTypeOf<Result<number, string>>();
`),
      info('テストの実行方法と書き方の詳細は、リポジトリの `docs/testing.md` にまとめています。'),
    ],
    codeRefs: [
      {
        path: 'apps/api/src/domain/grading.test.ts',
        description: '採点ロジックの単体テスト',
      },
      {
        path: 'apps/api/test/notes.test.ts',
        description: '「他人のノートを読めないこと」を確かめる結合テスト',
      },
      {
        path: 'packages/shared/src/types.test-d.ts',
        description: '`expectTypeOf` による型のテスト',
      },
      {
        path: 'e2e/learning-flow.spec.ts',
        description: 'Playwright による E2E テスト',
      },
    ],
    questions: [
      single(
        '現在時刻に依存する関数をテストしやすくする方法として、最も適切なのはどれですか？',
        [
          'テストを実行する時刻を決めておく',
          '現在時刻を引数で受け取れるようにする',
          '現在時刻を使う処理はテストしない',
          'テストの中で sleep して時刻を合わせる',
        ],
        1,
        '時刻を外から渡せるようにすると、テストでは固定した値を使えます。これを依存の注入と呼びます。',
      ),
      blank(
        '型を検査する Vitest の関数名を埋めてください。',
        `
import { ____ } from 'vitest';

____<UserId>().not.toEqualTypeOf<LessonId>();
`,
        ['expectTypeOf'],
        '`expectTypeOf` は、値ではなく型についての主張を書くための関数です。',
      ),
    ],
  },
];
