import { blank, code, h, info, list, multi, p, single, warn, type LessonContent } from './types';

export const intermediate: LessonContent[] = [
  {
    id: 'narrowing',
    chapterId: 'intermediate',
    title: '型の絞り込みと型ガード',
    summary: '条件分岐によってユニオン型を具体的な型へ絞り込む仕組み。',
    body: [
      p(
        'ユニオン型の値は、そのままでは全メンバーに共通する操作しかできません。条件分岐で確かめると、TypeScript がそのブロック内の型を自動で絞り込みます。これを narrowing と呼びます。',
      ),
      code(`
function format(value: string | number): string {
  if (typeof value === 'string') {
    return value.toUpperCase(); // ここでは string
  }
  return value.toFixed(2);      // ここでは number
}
`),
      h('絞り込みに使える書き方'),
      list(
        "`typeof x === 'string'` … プリミティブの判定",
        '`x instanceof Date` … クラスのインスタンスの判定',
        "`'key' in x` … プロパティの有無による判定",
        '`x === null` / `x !== undefined` … 値の比較',
        '`Array.isArray(x)` … 配列の判定',
      ),
      h('自作の型ガード'),
      p(
        '戻り値の型を `引数 is 型` と書いた関数は、型ガードとして使えます。true を返したとき、呼び出し側で引数の型が絞り込まれます。',
      ),
      code(`
function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0;
}

function handle(input: unknown) {
  if (isNonEmptyString(input)) {
    input.trim(); // string として扱える
  }
}
`),
      warn(
        '型ガードの中身が正しいかどうかは TypeScript は検証しません。判定を間違えると、型と実際の値が食い違ってしまいます。',
      ),
    ],
    codeRefs: [
      {
        path: 'apps/api/src/middleware/error-handler.ts',
        description: '`error instanceof HttpError` で例外の種類を絞り込んでいる',
      },
      {
        path: 'apps/web/src/lib/api.ts',
        description: '`error instanceof ApiError` で API のエラーかどうかを判定',
      },
    ],
    questions: [
      multi(
        '`value: string | Date` を Date に絞り込める条件をすべて選んでください。',
        [
          'value instanceof Date',
          "typeof value === 'object'",
          "typeof value !== 'string'",
          'value.length > 0',
        ],
        [0, 1, 2],
        "`instanceof` のほか、`typeof` が `'object'` であること、`'string'` でないことからも Date に絞り込めます。`value.length` は絞り込み前にはアクセスできません。",
      ),
      blank(
        '型ガード関数の戻り値の型を完成させてください。',
        `
function isNumber(value: unknown): value ____ number {
  return typeof value === 'number';
}
`,
        ['is'],
        '`value is number` と書くと、この関数が true を返したときに value が number に絞り込まれます。',
      ),
    ],
  },
  {
    id: 'discriminated-unions',
    chapterId: 'intermediate',
    title: '判別可能ユニオンと網羅性チェック',
    summary: '共通の目印プロパティで種類を見分け、処理漏れをコンパイラに検出させます。',
    body: [
      p(
        '各メンバーが共通の「目印」プロパティ（判別子）をリテラル型で持つユニオンを、判別可能ユニオンと呼びます。実務で最もよく使う型のパターンの 1 つです。',
      ),
      code(`
type Question =
  | { kind: 'single-choice'; choices: string[]; answerIndex: number }
  | { kind: 'fill-blank'; acceptedAnswers: string[] };

function describe(question: Question): string {
  switch (question.kind) {
    case 'single-choice':
      return \`\${question.choices.length} 択\`; // choices にアクセスできる
    case 'fill-blank':
      return '穴埋め';                          // acceptedAnswers にアクセスできる
  }
}
`),
      h('なぜ便利なのか'),
      p(
        '「オプショナルなプロパティをたくさん持つ 1 つの型」と違い、あり得ない組み合わせ（選択式なのに choices がない、など）を型の段階で排除できます。',
      ),
      h('網羅性チェック'),
      p(
        'すべての case を処理すると、残りの型は `never` になります。これを利用して、種類を追加したのに処理を書き忘れた箇所をコンパイルエラーにできます。',
      ),
      code(`
function assertNever(value: never): never {
  throw new Error('想定外の値です');
}

switch (question.kind) {
  case 'single-choice': /* ... */ break;
  case 'fill-blank':    /* ... */ break;
  default:
    assertNever(question); // 新しい kind を足すと、ここがエラーになる
}
`),
      info(
        'このアプリでは、クイズの問題、レッスン本文のブロック、Result 型がすべて判別可能ユニオンです。',
      ),
    ],
    codeRefs: [
      {
        path: 'packages/shared/src/schemas/quiz.ts',
        description: '`kind` を判別子にした問題と解答の定義',
      },
      {
        path: 'apps/api/src/domain/grading.ts',
        description: 'switch と `assertNever` による採点と網羅性チェック',
      },
      {
        path: 'apps/web/src/features/lessons/ContentRenderer.tsx',
        description: 'ブロックの `type` ごとに描画を切り替えている',
      },
    ],
    questions: [
      single(
        '判別可能ユニオンに必要なものはどれですか？',
        [
          'すべてのメンバーが同じプロパティだけを持つこと',
          '各メンバーが共通の名前のプロパティを、異なるリテラル型で持つこと',
          '各メンバーが class で定義されていること',
          'すべてのプロパティが省略可能であること',
        ],
        1,
        '共通のプロパティ（判別子）がメンバーごとに異なるリテラル型を持つことで、その値を調べるだけで種類を特定できます。',
      ),
      blank(
        'すべての case を処理した後に残る型を埋めてください。',
        `
function assertNever(value: ____): never {
  throw new Error('想定外の値です');
}
`,
        ['never'],
        '起こり得ない値の型は `never` です。処理漏れがあると、never でない値を渡すことになりエラーになります。',
      ),
    ],
  },
  {
    id: 'generics',
    chapterId: 'intermediate',
    title: 'ジェネリクス',
    summary: '型を引数として受け取り、さまざまな型に対して安全に再利用できるコードを書きます。',
    body: [
      p(
        'ジェネリクスは「型の引数」です。関数が値を引数で受け取るように、型を `<T>` で受け取ります。',
      ),
      code(`
function first<T>(items: T[]): T | undefined {
  return items[0];
}

const n = first([1, 2, 3]);   // T は number と推論される
const s = first(['a', 'b']);  // T は string と推論される
`),
      p(
        '`any` を使っても同じ関数は書けますが、戻り値の型情報が失われます。ジェネリクスなら「入力と出力の型の関係」を保てます。',
      ),
      h('型にも使える'),
      code(`
type Paginated<T> = {
  items: T[];
  page: number;
  totalItems: number;
};

type NotePage = Paginated<Note>;
`),
      h('制約（extends）'),
      p(
        '`T extends 条件` と書くと、受け取れる型を制限できます。制限することで、関数の中で T のプロパティを安全に使えるようになります。',
      ),
      code(`
function byId<T extends { id: string }>(items: T[], id: string): T | undefined {
  return items.find((item) => item.id === id); // id があることが保証されている
}
`),
      info('型引数は、ほとんどの場合は呼び出し時に書かなくても引数から推論されます。'),
    ],
    codeRefs: [
      {
        path: 'packages/shared/src/schemas/common.ts',
        description: '`Paginated<T>` と、それを作る `paginate<T>()`',
      },
      {
        path: 'packages/shared/src/result.ts',
        description: '`Result<T, E>` と `mapResult<T, U, E>()`',
      },
      {
        path: 'apps/api/src/middleware/validate.ts',
        description: 'スキーマの型をジェネリクスで受け取り、ハンドラへ伝えている',
      },
    ],
    questions: [
      single(
        "`function wrap<T>(value: T): T[]` を `wrap('a')` と呼び出したときの戻り値の型はどれですか？",
        ['any[]', 'unknown[]', 'string[]', 'T[]'],
        2,
        "引数 `'a'` から T が string と推論され、戻り値は `string[]` になります。",
      ),
      blank(
        'T が `length` プロパティを持つ型に限定されるよう、キーワードを埋めてください。',
        `
function longest<T ____ { length: number }>(a: T, b: T): T {
  return a.length >= b.length ? a : b;
}
`,
        ['extends'],
        '型引数の制約は `extends` で書きます。',
      ),
    ],
  },
  {
    id: 'utility-types',
    chapterId: 'intermediate',
    title: 'ユーティリティ型',
    summary: '既存の型から新しい型を作る、標準の変換用の型。',
    body: [
      p(
        'TypeScript には、型を加工するための型が標準で用意されています。似た型を手書きで複製せず、元の型から導出することで、変更に強くなります。',
      ),
      code(`
type Note = { id: string; title: string; body: string; updatedAt: Date };

type NoteDraft = Omit<Note, 'id' | 'updatedAt'>;  // { title; body }
type NoteTitle = Pick<Note, 'id' | 'title'>;       // { id; title }
type NotePatch = Partial<NoteDraft>;               // { title?; body? }
type Frozen = Readonly<Note>;                      // 全プロパティが readonly
`),
      h('よく使うもの'),
      list(
        '`Partial<T>` / `Required<T>` … 全プロパティを省略可能に / 必須に',
        '`Pick<T, K>` / `Omit<T, K>` … 指定したプロパティだけ残す / 取り除く',
        '`Record<K, V>` … キーが K、値が V のオブジェクト',
        '`Exclude<U, X>` / `Extract<U, X>` … ユニオンから取り除く / 取り出す',
        '`NonNullable<T>` … null と undefined を取り除く',
        '`ReturnType<F>` / `Parameters<F>` … 関数の戻り値 / 引数の型',
        '`Awaited<T>` … Promise の中身の型',
      ),
      h('関数から型を導出する'),
      p('`ReturnType` を使うと、関数の戻り値の型を手書きせずに取り出せます。'),
      code(`
function createNoteRepository(db: Database) {
  return { list() {}, insert() {} };
}

type NoteRepository = ReturnType<typeof createNoteRepository>;
`),
    ],
    codeRefs: [
      {
        path: 'apps/api/src/repositories/note-repository.ts',
        description: '`Partial<Pick<NoteRow, ...>>` で「一部の列だけの更新」を表現',
      },
      {
        path: 'apps/api/src/services/index.ts',
        description: '`ReturnType<typeof createServices>` でサービス全体の型を導出',
      },
      {
        path: 'packages/shared/src/types.test-d.ts',
        description: '`Extract` でユニオンから特定のメンバーを取り出している',
      },
    ],
    questions: [
      single(
        "`Omit<{ a: string; b: number; c: boolean }, 'b'>` の結果はどれですか？",
        ['{ b: number }', '{ a: string; c: boolean }', '{ a?: string; c?: boolean }', 'never'],
        1,
        '`Omit` は指定したプロパティを取り除いた型を作ります。',
      ),
      blank(
        '全プロパティを省略可能にするユーティリティ型を埋めてください。',
        `
type NotePatch = ____<{ title: string; body: string }>;
// { title?: string; body?: string }
`,
        ['Partial'],
        '`Partial<T>` は T の全プロパティに `?` を付けます。',
      ),
    ],
  },
  {
    id: 'unknown-any-never',
    chapterId: 'intermediate',
    title: 'unknown・any・never',
    summary: '特殊な 3 つの型の違いと、any を避けるべき理由。',
    body: [
      h('any: 型チェックを無効にする'),
      p(
        '`any` はどんな操作も許してしまい、TypeScript を使う意味を失わせます。しかも any から取り出した値も any になり、周囲へ広がっていきます。',
      ),
      code(`
const data: any = JSON.parse(text);
data.user.name.toUpperCase(); // 何でも通る。実行時に落ちるかもしれない
`),
      h('unknown: 安全な「何でも入る」型'),
      p(
        '`unknown` も何でも代入できますが、型を確かめるまで何も操作できません。外部から来た値（API の応答、JSON、catch した例外）は unknown で受け、検証してから使います。',
      ),
      code(`
const data: unknown = JSON.parse(text);
data.user;                       // エラー: まだ何か分からない

if (typeof data === 'string') {
  data.toUpperCase();            // OK: string に絞り込まれた
}
`),
      h('never: 起こり得ないことを表す'),
      p(
        '`never` は「値が存在しない」型です。必ず例外を投げる関数の戻り値や、すべての可能性を除外した後の型として現れます。',
      ),
      code(`
function fail(message: string): never {
  throw new Error(message);
}
`),
      warn(
        '`as` による型アサーションも、any と同様に型チェックを迂回します。使うのは「検証済みの値にブランドを付ける」など、理由を説明できる箇所だけに留めます。',
      ),
    ],
    codeRefs: [
      {
        path: 'apps/api/src/lib/npm-registry.ts',
        description: '外部 API の応答を `unknown` で受け、Zod で検証してから使っている',
      },
      {
        path: 'apps/web/src/lib/api.ts',
        description: 'エラー応答の JSON を unknown として扱い、スキーマで確認',
      },
      {
        path: 'eslint.config.js',
        description: '`no-explicit-any` などのルールで any の使用を検出',
      },
    ],
    questions: [
      single(
        '`const x: unknown = 5;` の直後に、エラーにならないのはどれですか？',
        ['x.toFixed(1)', 'x + 1', "typeof x === 'number'", 'x.length'],
        2,
        'unknown の値には、型を確かめる操作（typeof など）しかできません。確かめた後のブロック内では操作できるようになります。',
      ),
      single(
        'API から受け取った JSON を受ける型として最も適切なのはどれですか？',
        ['any', 'unknown', 'never', 'object'],
        1,
        '外部から来た値は `unknown` で受け、検証して型を確定させてから使うのが安全です。',
      ),
    ],
  },
  {
    id: 'as-const-and-satisfies',
    chapterId: 'intermediate',
    title: 'as const と satisfies',
    summary: '値からできるだけ正確な型を取り出し、同時に形も検査する書き方。',
    body: [
      h('as const'),
      p(
        'オブジェクトや配列に `as const` を付けると、中身がすべて readonly になり、値がリテラル型のまま保たれます。',
      ),
      code(`
const CODES = ['NOT_FOUND', 'CONFLICT'];
// string[]

const CODES2 = ['NOT_FOUND', 'CONFLICT'] as const;
// readonly ['NOT_FOUND', 'CONFLICT']

type Code = (typeof CODES2)[number]; // 'NOT_FOUND' | 'CONFLICT'
`),
      p('値の一覧を 1 か所に書き、そこから型を導出できるので、値と型を二重に管理せずに済みます。'),
      h('satisfies'),
      p(
        '`satisfies 型` は「この値がその型に合っているか」を検査しますが、変数の型は推論されたままにします。型注釈との違いを比べてみましょう。',
      ),
      code(`
type Code = 'NOT_FOUND' | 'CONFLICT';

// 型注釈: 検査はされるが、値の型が number に広がる
const a: Record<Code, number> = { NOT_FOUND: 404, CONFLICT: 409 };
a.NOT_FOUND; // number

// satisfies: 検査されつつ、リテラル型が保たれる
const b = { NOT_FOUND: 404, CONFLICT: 409 } as const satisfies Record<Code, number>;
b.NOT_FOUND; // 404
`),
      info(
        '`satisfies` は、キーの書き漏れや余計なキーも検出します。設定オブジェクトや対応表を書くときに特に有効です。',
      ),
    ],
    codeRefs: [
      {
        path: 'packages/shared/src/errors.ts',
        description: '`ERROR_CODES` と `ERROR_STATUS` で両方を使っている',
      },
      {
        path: 'apps/api/src/config/config.ts',
        description: '`RATE_LIMITS` の定義と、そこから導出した `RateLimitName`',
      },
      {
        path: 'packages/shared/src/schemas/lesson.ts',
        description: '`CHAPTERS` から `ChapterId` を導出',
      },
    ],
    questions: [
      single(
        "`const SIZES = ['s', 'm'] as const;` のとき、`(typeof SIZES)[number]` はどれですか？",
        ['string', "'s' | 'm'", 'readonly string[]', 'number'],
        1,
        "`as const` によりタプル `readonly ['s', 'm']` になり、`[number]` で要素の型のユニオンを取り出せます。",
      ),
      blank(
        '値の型を広げずに、形だけを検査するキーワードを埋めてください。',
        `
const limits = {
  auth: { limit: 10 },
} ____ Record<string, { limit: number }>;
`,
        ['satisfies'],
        '`satisfies` は型に合っているかを検査しつつ、推論された型を保ちます。',
      ),
    ],
  },
];
