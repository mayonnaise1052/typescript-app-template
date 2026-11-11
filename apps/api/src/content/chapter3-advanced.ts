import { blank, code, h, info, list, p, single, warn, type LessonContent } from './types';

export const advanced: LessonContent[] = [
  {
    id: 'keyof-typeof',
    chapterId: 'advanced',
    title: 'keyof・typeof・インデックスアクセス型',
    summary: '値や型から、別の型を取り出すための 3 つの演算子。',
    body: [
      h('typeof: 値から型を取り出す'),
      p(
        '型の文脈で `typeof 変数` と書くと、その変数の型を取得できます（実行時の typeof 演算子とは別物です）。',
      ),
      code(`
const config = { limit: 10, windowSeconds: 60 };
type Config = typeof config; // { limit: number; windowSeconds: number }
`),
      h('keyof: キーのユニオンを取り出す'),
      code(`
type ConfigKey = keyof Config; // 'limit' | 'windowSeconds'

function read<T, K extends keyof T>(target: T, key: K): T[K] {
  return target[key];
}

read(config, 'limit');  // number
read(config, 'oops');   // エラー: そのキーは存在しない
`),
      h('インデックスアクセス型'),
      p(
        '`T[K]` と書くと、型 T のプロパティ K の型を取り出せます。配列やタプルには `[number]` を使います。',
      ),
      code(`
type Limit = Config['limit'];          // number
type Question = Quiz['questions'][number]; // 配列の要素の型
type Kind = Question['kind'];          // 判別子のユニオン
`),
      info('`keyof typeof 値` は、定数オブジェクトのキーをユニオン型にする定番の組み合わせです。'),
    ],
    codeRefs: [
      {
        path: 'apps/api/src/config/config.ts',
        description: '`keyof typeof RATE_LIMITS` でレート制限の名前を型にしている',
      },
      {
        path: 'packages/shared/src/schemas/quiz.ts',
        description: "`Question['kind']` で問題の種類のユニオンを取り出している",
      },
    ],
    questions: [
      single(
        '`type T = { a: string; b: number }` のとき、`keyof T` はどれですか？',
        ['string | number', "'a' | 'b'", '{ a: string; b: number }', 'string[]'],
        1,
        '`keyof` はプロパティ名のユニオン型を返します。',
      ),
      blank(
        '定数 `ROLES` のキーをユニオン型として取り出してください。',
        `
const ROLES = { admin: 1, member: 2 };
type Role = ____ typeof ROLES; // 'admin' | 'member'
`,
        ['keyof'],
        '`typeof ROLES` で型を取り出し、`keyof` でそのキーのユニオンにします。',
      ),
    ],
  },
  {
    id: 'mapped-types',
    chapterId: 'advanced',
    title: 'Mapped Types',
    summary: '既存の型のプロパティを 1 つずつ変換して、新しい型を作ります。',
    body: [
      p(
        'Mapped Type は、キーのユニオンをループして型を組み立てる構文です。配列の `map` の型版だと考えると分かりやすいでしょう。',
      ),
      code(`
type Flags<T> = {
  [K in keyof T]: boolean;
};

type Note = { title: string; body: string };
type NoteFlags = Flags<Note>; // { title: boolean; body: boolean }
`),
      h('修飾子の追加と削除'),
      p(
        '`?` や `readonly` を付けたり、`-?` や `-readonly` で外したりできます。実は `Partial` や `Readonly` はこの仕組みで定義されています。',
      ),
      code(`
type MyPartial<T> = { [K in keyof T]?: T[K] };
type MyRequired<T> = { [K in keyof T]-?: T[K] };
type Mutable<T> = { -readonly [K in keyof T]: T[K] };
`),
      h('キーの付け替え'),
      p('`as` を使うと、キーの名前自体を変換できます。'),
      code(`
type Getters<T> = {
  [K in keyof T as \`get\${Capitalize<string & K>}\`]: () => T[K];
};

type NoteGetters = Getters<Note>;
// { getTitle: () => string; getBody: () => string }
`),
      info(
        'フォームの「フィールドごとのエラー」のように、ある型と同じキーを持つ別の型が欲しい場面で活躍します。',
      ),
    ],
    codeRefs: [
      {
        path: 'packages/shared/src/errors.ts',
        description: '`Record<ErrorCode, number>`（Record も Mapped Type で定義されている）',
      },
      {
        path: 'apps/web/src/lib/form.ts',
        description: 'フォームの各項目に対応するエラーの型 `FormErrors<T>`',
      },
    ],
    questions: [
      single(
        "`{ [K in 'a' | 'b']: number }` はどの型と同じですか？",
        [
          '{ a: number } | { b: number }',
          '{ a: number; b: number }',
          "Record<number, 'a' | 'b'>",
          'number[]',
        ],
        1,
        'Mapped Type はユニオンの各メンバーをキーとするプロパティを 1 つのオブジェクト型にまとめます。',
      ),
      blank(
        'T のキーを順に取り出すキーワードを埋めてください。',
        `
type Nullable<T> = {
  [K ____ keyof T]: T[K] | null;
};
`,
        ['in'],
        'Mapped Type では `[K in キーのユニオン]` と書いてキーを列挙します。',
      ),
    ],
  },
  {
    id: 'conditional-types',
    chapterId: 'advanced',
    title: '条件型と infer',
    summary: '型レベルの if 文。型の一部を取り出す infer も扱います。',
    body: [
      p(
        '条件型は `T extends U ? X : Y` という形で、「T が U に代入できるなら X、そうでなければ Y」を表します。',
      ),
      code(`
type IsString<T> = T extends string ? true : false;

type A = IsString<'hello'>; // true
type B = IsString<42>;      // false
`),
      h('infer: 型の一部を取り出す'),
      p('`infer 名前` を使うと、パターンに一致した部分の型を変数として取り出せます。'),
      code(`
type ElementOf<T> = T extends (infer E)[] ? E : never;
type N = ElementOf<number[]>; // number

type Unwrap<T> = T extends Promise<infer V> ? V : T;
type U = Unwrap<Promise<string>>; // string
`),
      h('ユニオンへの分配'),
      p(
        '型引数にユニオンを渡すと、条件型はメンバー 1 つずつに適用されます。`Exclude` や `Extract` はこの性質を使って定義されています。',
      ),
      code(`
type MyExclude<T, U> = T extends U ? never : T;
type R = MyExclude<'a' | 'b' | 'c', 'a'>; // 'b' | 'c'
`),
      warn(
        '条件型は強力ですが、読みにくくなりがちです。アプリのコードではまず標準のユーティリティ型で足りないかを考え、複雑な型には必ず説明のコメントと型のテストを付けましょう。',
      ),
    ],
    codeRefs: [
      {
        path: 'apps/api/src/content/types.ts',
        description: '分配を利用した `DistributiveOmit<T, K>` の定義',
      },
      {
        path: 'apps/web/src/lib/api.ts',
        description: 'Hono の `InferResponseType` で、API の応答の型を取り出している',
      },
    ],
    questions: [
      single(
        "`type T = string extends number ? 'yes' : 'no'` の結果はどれですか？",
        ["'yes'", "'no'", "'yes' | 'no'", 'never'],
        1,
        "string は number に代入できないので、偽の側の `'no'` になります。",
      ),
      blank(
        '関数の戻り値の型を取り出すキーワードを埋めてください。',
        `
type MyReturnType<F> = F extends (...args: never[]) => ____ R ? R : never;
`,
        ['infer'],
        '`infer R` で、一致した位置の型を R として取り出せます。',
      ),
    ],
  },
  {
    id: 'template-literal-types',
    chapterId: 'advanced',
    title: 'テンプレートリテラル型',
    summary: '文字列の形そのものを型で表現します。',
    body: [
      p('テンプレートリテラルと同じ構文を型で使うと、文字列のパターンを表せます。'),
      code(`
type Method = 'GET' | 'POST';
type Path = '/notes' | '/lessons';

type Route = \`\${Method} \${Path}\`;
// 'GET /notes' | 'GET /lessons' | 'POST /notes' | 'POST /lessons'
`),
      p('ユニオン同士を組み合わせると、すべての組み合わせが自動で展開されます。'),
      h('パターンとして使う'),
      code(`
type CssSize = \`\${number}px\` | \`\${number}rem\`;

const a: CssSize = '16px';  // OK
const b: CssSize = '16';    // エラー
`),
      h('文字列操作の型'),
      list(
        '`Uppercase<S>` / `Lowercase<S>` … 大文字 / 小文字に変換',
        '`Capitalize<S>` / `Uncapitalize<S>` … 先頭の 1 文字だけ変換',
      ),
      h('infer と組み合わせる'),
      p(
        '条件型と組み合わせると、文字列を分解して型を取り出せます。ルーティングライブラリが、パスの文字列からパラメータ名の型を導くのに使っている技法です。',
      ),
      code(`
type ParamOf<P> = P extends \`\${string}/:\${infer Name}\` ? Name : never;
type X = ParamOf<'/notes/:noteId'>; // 'noteId'
`),
      info("Hono が `c.req.param('noteId')` に型を付けられるのは、この仕組みのおかげです。"),
    ],
    codeRefs: [
      {
        path: 'apps/api/src/routes/notes.ts',
        description: 'パス `/:noteId` の文字列から、パラメータ名の型が導かれている',
      },
      {
        path: 'apps/api/src/services/rate-limit-service.ts',
        description: 'レート制限のキーをテンプレートリテラルで組み立てている',
      },
    ],
    questions: [
      single(
        '次の型 `T` は何通りの文字列を表しますか？',
        ['2 通り', '3 通り', '4 通り', '無限'],
        2,
        'ユニオン同士の組み合わせがすべて展開されるので、2 × 2 = 4 通りです。',
        { code: "type T = `${'a' | 'b'}-${1 | 2}`;" },
      ),
      single(
        '次の型 `Id` に代入できる値はどれですか？',
        ["'user'", "'user_42'", "'admin_42'", "'42_user'"],
        1,
        '`user_` で始まる文字列だけが一致します。',
        { code: 'type Id = `user_${string}`;' },
      ),
    ],
  },
  {
    id: 'branded-types',
    chapterId: 'advanced',
    title: 'Branded Types',
    summary: '同じ string でも「別物」として区別させ、ID の取り違えを防ぎます。',
    body: [
      p(
        'TypeScript は構造的型付けなので、`UserId` も `LessonId` もただの string として定義すると、取り違えてもエラーになりません。',
      ),
      code(`
type UserId = string;
type LessonId = string;

function findNotes(userId: UserId, lessonId: LessonId) {}

findNotes(lessonId, userId); // 引数が逆でもコンパイルが通ってしまう
`),
      h('ブランドを付ける'),
      p('実行時には存在しない「目印」のプロパティを型にだけ付けて、別の型として扱わせます。'),
      code(`
declare const brand: unique symbol;
type Brand<T, Name extends string> = T & { readonly [brand]: Name };

type UserId = Brand<string, 'UserId'>;
type LessonId = Brand<string, 'LessonId'>;

findNotes(lessonId, userId); // エラー: LessonId は UserId に代入できない
`),
      h('ブランド付きの値を作る場所を限定する'),
      p(
        'ただの string をブランド付きの型にできるのは、「検証を通った」ときだけにします。こうすると、その型の値は必ず検証済みだと保証できます。',
      ),
      code(`
function parseUserId(value: string): UserId {
  if (value.length === 0) throw new Error('不正な ID です');
  return value as UserId; // アサーションはこの 1 か所だけ
}
`),
      info(
        'このアプリでは、Zod の `.brand()` で ID を定義しています。パスワードのハッシュにもブランドを付け、平文のパスワードを DB に保存するミスをコンパイルエラーにしています。',
      ),
      warn(
        'ブランドは型だけの存在で、実行時のコストはありません。JSON に出力しても、ただの文字列です。',
      ),
    ],
    codeRefs: [
      {
        path: 'packages/shared/src/brand.ts',
        description: '`Brand<T, Name>` の定義',
      },
      {
        path: 'packages/shared/src/schemas/common.ts',
        description: 'Zod の `.brand()` による `UserId` や `LessonId` の定義',
      },
      {
        path: 'apps/api/src/lib/password.ts',
        description: '`PasswordHash` 型。作れるのは `hashPassword` だけ',
      },
    ],
    questions: [
      single(
        'Branded Types が解決する問題はどれですか？',
        [
          '実行時の処理速度が遅いこと',
          '形が同じ型どうしを取り違えてもエラーにならないこと',
          'JSON に変換できない値があること',
          '型推論が遅いこと',
        ],
        1,
        '構造的型付けでは形が同じなら互換になるため、意味の異なる値を区別するにはブランドが必要です。',
      ),
      single(
        'ブランド用のプロパティは、実行時のオブジェクトにどう影響しますか？',
        [
          '実際にプロパティが追加される',
          '型だけの存在で、実行時には何も追加されない',
          'クラスのインスタンスに変換される',
          'Symbol が自動で生成される',
        ],
        1,
        'ブランドは型の上だけの目印です。値は元の string のままです。',
      ),
    ],
  },
];
