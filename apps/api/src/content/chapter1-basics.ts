import { blank, code, h, info, list, multi, p, single, warn, type LessonContent } from './types';

export const basics: LessonContent[] = [
  {
    id: 'types-and-inference',
    chapterId: 'basics',
    title: '型注釈と型推論',
    summary: 'TypeScript の出発点。型をどこに書き、どこを推論に任せるかを学びます。',
    body: [
      p(
        'TypeScript は JavaScript に「型」を足した言語です。型はコンパイル時にだけ存在し、実行時には消えます。つまり型は、コードを実行する前に間違いを見つけるための仕組みです。',
      ),
      h('型注釈'),
      p('変数名や引数の後ろに `: 型` と書いて、入る値の種類を宣言します。'),
      code(`
let userName: string = 'Taro';
let age: number = 20;
let isAdmin: boolean = false;

age = '二十'; // エラー: string を number に代入できない
`),
      h('型推論'),
      p(
        '初期値があれば、TypeScript が型を自動で決めてくれます。これを型推論と呼びます。ローカル変数は推論に任せ、関数の引数や公開する関数の戻り値には注釈を書くのが一般的です。',
      ),
      code(`
let count = 0;        // number と推論される
const label = 'ok';   // const なので 'ok' というリテラル型になる
`),
      info(
        "`let` で宣言すると後で別の値を入れられるため `string` に広がり、`const` だと値が変わらないので `'ok'` そのものが型になります。この違いは後の「リテラル型」で効いてきます。",
      ),
      h('基本の型'),
      list(
        '`string` / `number` / `boolean` … 基本の 3 つ',
        '`null` / `undefined` … 「値がない」を表す。`strict` 設定では他の型と区別される',
        '`bigint` / `symbol` … 大きな整数と一意な識別子',
      ),
    ],
    codeRefs: [
      {
        path: 'tsconfig.base.json',
        description: '`strict: true` など、このアプリが有効にしている厳格な設定',
      },
      {
        path: 'apps/api/src/config/config.ts',
        description: '定数は注釈を書かず、推論と as const に任せている例',
      },
    ],
    questions: [
      single(
        '次のコードで、変数 `label` の型はどれになりますか？',
        ['string', "'ready'", 'any', 'unknown'],
        1,
        "`const` で宣言した変数は再代入できないため、値そのものを表すリテラル型 `'ready'` に推論されます。`let` なら `string` です。",
        { code: "const label = 'ready';" },
      ),
      single(
        '型についての説明として正しいものはどれですか？',
        [
          '型は実行時にも残り、実行速度を上げる',
          '型はコンパイル時にだけ存在し、実行時には消える',
          '型を書くと JavaScript に変換できなくなる',
          '型推論を使うと型チェックが行われなくなる',
        ],
        1,
        'TypeScript の型はコンパイル時の検査にだけ使われ、出力される JavaScript には残りません。',
      ),
    ],
  },
  {
    id: 'functions',
    chapterId: 'basics',
    title: '関数の型',
    summary: '引数と戻り値の型、省略可能な引数、関数そのものの型を扱います。',
    body: [
      p(
        '関数では、引数と戻り値に型を書きます。戻り値は推論もできますが、外部に公開する関数では明示しておくと意図しない変更に気付きやすくなります。',
      ),
      code(`
function add(a: number, b: number): number {
  return a + b;
}

const greet = (name: string): string => \`こんにちは、\${name}さん\`;
`),
      h('省略可能な引数と既定値'),
      code(`
function paginate(page: number, pageSize?: number) {
  // pageSize の型は number | undefined
  return { page, pageSize: pageSize ?? 10 };
}

function paginate2(page: number, pageSize = 10) {
  // 既定値があれば、型は number と推論される
}
`),
      h('関数の型'),
      p('関数自体も値なので、型で表せます。コールバックを受け取る関数でよく使います。'),
      code(`
type Comparator = (a: number, b: number) => number;

const ascending: Comparator = (a, b) => a - b; // 引数の型は Comparator から推論される
`),
      info(
        '戻り値がない関数の型は `void` です。`undefined` を返すこととは少し意味が違い、「戻り値を使わない」という宣言です。',
      ),
    ],
    codeRefs: [
      {
        path: 'apps/api/src/domain/streak.ts',
        description: '既定値つきの引数を持つ純粋関数 `calculateStreak`',
      },
      {
        path: 'apps/api/src/lib/npm-registry.ts',
        description: '関数の型 `FetchLike` を定義し、fetch を引数で受け取っている例',
      },
    ],
    questions: [
      single(
        '引数 `pageSize?: number` の、関数内での型はどれですか？',
        ['number', 'number | null', 'number | undefined', 'any'],
        2,
        '`?` を付けた引数は省略できるため、型に `undefined` が加わります。',
      ),
      blank(
        '何も返さない関数の戻り値の型を埋めてください。',
        `
function log(message: string): ____ {
  console.log(message);
}
`,
        ['void'],
        '戻り値を返さない関数の戻り値の型は `void` です。',
      ),
    ],
  },
  {
    id: 'objects-and-interfaces',
    chapterId: 'basics',
    title: 'オブジェクト型・type と interface',
    summary: 'オブジェクトの形を型で表す 2 つの書き方と、構造的型付けの考え方。',
    body: [
      p('オブジェクトの形は `type`（型エイリアス）か `interface` で名前を付けて表します。'),
      code(`
type User = {
  id: string;
  displayName: string;
  bio?: string;            // 省略可能
  readonly createdAt: Date; // 再代入できない
};

interface Lesson {
  id: string;
  title: string;
}
`),
      h('type と interface の違い'),
      list(
        '`type` はユニオン型やタプルなど、オブジェクト以外にも名前を付けられる',
        '`interface` は同名で宣言すると自動的に結合される（宣言のマージ）',
        'オブジェクトの形を表すだけなら、どちらでもほぼ同じように使える',
      ),
      p(
        'このアプリでは、ユニオン型と一緒に使う場面が多いため `type` に統一しています。チーム内でどちらかに揃えることが大切です。',
      ),
      h('構造的型付け'),
      p(
        'TypeScript は「名前」ではなく「形」で型の互換性を判断します。必要なプロパティを持っていれば、別の名前の型でも代入できます。',
      ),
      code(`
type HasId = { id: string };

const lesson = { id: 'generics', title: 'ジェネリクス' };
const target: HasId = lesson; // OK: id を持っているので互換
`),
      warn(
        '形さえ合えば通ってしまうことが、ID の取り違えのような不具合につながる場合があります。その対策は第3章の「Branded Types」で扱います。',
      ),
    ],
    codeRefs: [
      {
        path: 'apps/api/src/env.ts',
        description: 'Worker のバインディングとコンテキスト変数をオブジェクト型で定義',
      },
      {
        path: 'apps/api/src/services/auth-service.ts',
        description: '`toUser` で DB の行から公開用のオブジェクトを組み立てている例',
      },
    ],
    questions: [
      multi(
        '`interface` ではなく `type` でしか書けないものをすべて選んでください。',
        [
          "ユニオン型（例: 'a' | 'b'）",
          'プロパティを持つオブジェクトの形',
          'タプル型（例: [string, number]）',
          'メソッドを持つオブジェクトの形',
        ],
        [0, 2],
        'ユニオン型やタプル型に名前を付けられるのは `type` だけです。オブジェクトの形はどちらでも書けます。',
      ),
      blank(
        '`createdAt` を再代入できないようにする修飾子を埋めてください。',
        `
type User = {
  ____ createdAt: Date;
};
`,
        ['readonly'],
        '`readonly` を付けたプロパティへの再代入はコンパイルエラーになります。',
      ),
    ],
  },
  {
    id: 'arrays-and-tuples',
    chapterId: 'basics',
    title: '配列・タプル・readonly',
    summary: '配列とタプルの型、そして添字アクセスの安全性について。',
    body: [
      p('配列は `要素の型[]` と書きます。`Array<要素の型>` と書いても同じ意味です。'),
      code(`
const scores: number[] = [80, 95, 70];
const names: Array<string> = ['Aoi', 'Ren'];
`),
      h('タプル'),
      p('長さと各位置の型が決まっている配列をタプルと呼びます。'),
      code(`
const entry: [string, number] = ['generics', 3];
const [lessonId, score] = entry; // string と number に分かれる
`),
      h('readonly な配列'),
      p(
        '`readonly` を付けると、`push` などの変更操作がコンパイルエラーになります。関数の引数に付けると「この関数は配列を書き換えない」という約束になります。',
      ),
      code(`
function total(values: readonly number[]): number {
  // values.push(1); // エラー
  return values.reduce((sum, value) => sum + value, 0);
}
`),
      h('添字アクセスと undefined'),
      p(
        'このアプリは `noUncheckedIndexedAccess` を有効にしています。そのため `scores[10]` の型は `number` ではなく `number | undefined` になり、範囲外アクセスの見落としを防げます。',
      ),
      code(`
const first = scores[0]; // number | undefined
if (first !== undefined) {
  console.log(first.toFixed(1)); // ここでは number
}
`),
    ],
    codeRefs: [
      {
        path: 'apps/api/src/domain/grading.ts',
        description: '引数を `readonly Question[]` で受け取り、配列を書き換えないことを示している',
      },
      {
        path: 'apps/api/src/services/lesson-service.ts',
        description: '`summaries[index - 1]?.id ?? null` と、添字アクセスの undefined を扱っている',
      },
    ],
    questions: [
      single(
        '`noUncheckedIndexedAccess` が有効なとき、`const x = names[5]`（names は string[]）の x の型はどれですか？',
        ['string', 'string | undefined', 'undefined', 'never'],
        1,
        'この設定を有効にすると、添字アクセスの結果に `undefined` が加わり、範囲外アクセスを考慮せざるを得なくなります。',
      ),
      single(
        '`[string, number]` という型の説明として正しいものはどれですか？',
        [
          'string か number の配列',
          '1 番目が string、2 番目が number の、長さ 2 の配列',
          'string をキー、number を値とするオブジェクト',
          'string と number を結合した型',
        ],
        1,
        'これはタプル型で、長さと各位置の型が固定されています。',
      ),
    ],
  },
  {
    id: 'unions-and-literals',
    chapterId: 'basics',
    title: 'ユニオン型とリテラル型',
    summary: '「A または B」を表すユニオン型と、特定の値だけを許すリテラル型。',
    body: [
      p('`|` で型をつなぐと「どちらか」を表すユニオン型になります。'),
      code(`
let id: string | number;
id = 'abc';
id = 123;
`),
      h('リテラル型'),
      p(
        "`'info'` や `404` のような具体的な値そのものを型として使えます。ユニオンと組み合わせると、取り得る値を列挙できます。",
      ),
      code(`
type Tone = 'info' | 'warning';

function show(tone: Tone) {}

show('info');    // OK
show('danger');  // エラー: 'danger' は Tone に含まれない
`),
      info(
        '文字列リテラルのユニオンは、`enum` の代わりとして広く使われています。JavaScript に余計なコードを出力せず、補完も効きます。',
      ),
      h('null を含むユニオン'),
      p(
        '「値がないかもしれない」ことは `| null` で表します。`strict` 設定では、null の可能性を確認しないままプロパティにアクセスするとエラーになります。',
      ),
      code(`
function findTitle(id: string): string | null {
  return id === 'generics' ? 'ジェネリクス' : null;
}

const title = findTitle('x');
title.length;        // エラー: null かもしれない
title?.length;       // OK: オプショナルチェーン
title ?? '（なし）'; // OK: null のときの代替値
`),
    ],
    codeRefs: [
      {
        path: 'packages/shared/src/errors.ts',
        description: '`ErrorCode` をリテラル型のユニオンとして定義',
      },
      {
        path: 'packages/shared/src/schemas/note.ts',
        description: 'ノートの `lessonId` は「レッスンに紐付かない」場合があるので nullable',
      },
    ],
    questions: [
      single(
        "`type Size = 's' | 'm' | 'l'` のとき、コンパイルエラーになるのはどれですか？",
        [
          "const a: Size = 's'",
          "const b: Size = 'xl'",
          "const c: Size = 'm'",
          "const d: Size = 'l'",
        ],
        1,
        "`'xl'` は Size を構成するリテラルに含まれないため、代入できません。",
      ),
      blank(
        '`title` が null のときに代替の文字列を使う演算子を埋めてください。',
        `
const title: string | null = findTitle(id);
const label = title ____ '（なし）';
`,
        ['??'],
        'Null 合体演算子 `??` は、左辺が null または undefined のときだけ右辺を返します。',
      ),
    ],
  },
];
