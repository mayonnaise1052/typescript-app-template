import { blank, code, h, info, list, multi, p, single, warn, type LessonContent } from './types';

/**
 * 第1章 基礎。
 *
 * 各レッスンの本文と問題では、そのレッスンまでに習った書き方だけを使います
 * （docs/specs/0005-beginner-friendly-curriculum.md の 2.3）。
 * 新しい書き方を足すときは、どのレッスンで初めて習うかを確かめてください。
 */
export const basics: LessonContent[] = [
  {
    id: 'types-and-inference',
    chapterId: 'basics',
    title: '基本の型と型推論',
    summary: '文字列・数値・真偽値の型と、型を書く場所・書かなくてよい場所を学びます。',
    body: [
      p('TypeScript でいちばんよく使う型は、次の 3 つです。'),
      list(
        "`string` … 文字列（例: `'こんにちは'`）",
        '`number` … 数値。整数も小数も同じ型（例: `42`、`3.14`）',
        '`boolean` … 真偽値。`true` か `false`',
      ),
      h('型注釈'),
      p(
        '変数名の後ろに `: 型` と書くと、「この変数にはこの種類の値を入れる」と宣言できます。これを型注釈と呼びます。',
      ),
      code(`
let userName: string = '太郎';
let age: number = 20;
let isAdmin: boolean = false;

age = 21;     // OK: 数値なので入れられる
age = '二十'; // エラー: 文字列は number 型の変数に入れられない
`),
      h('型推論'),
      p(
        '最初に値を入れて宣言すると、TypeScript がその値から型を自動で決めてくれます。これを型推論と呼びます。',
      ),
      code(`
let count = 0;      // number と推論される
let title = '入門'; // string と推論される

count = 'たくさん'; // エラー: count は number 型
`),
      p(
        '型推論があるので、すべての変数に型注釈を書く必要はありません。値から型が分かる変数は推論に任せ、後のレッスンで習う関数の引数など、値から型が分からない場所に型注釈を書くのが一般的です。',
      ),
      info(
        'エディタで変数にマウスを乗せると、推論された型を確認できます。Playground でも同じように確認できます。',
      ),
      h('型が合わない計算もエラーになる'),
      code(`
let price = 100;
price.toUpperCase(); // エラー: toUpperCase は文字列のためのもので、number にはない
`),
      p(
        '型が分かっていると、その値で使えないメソッドを呼んだときにも、実行する前に教えてくれます。',
      ),
    ],
    codeRefs: [
      {
        path: 'apps/api/src/domain/streak.ts',
        description: '`DAY_MS` などの定数は、型注釈を書かずに型推論に任せている',
      },
      {
        path: 'tsconfig.base.json',
        description: 'このアプリが有効にしている型の検査の設定（`strict: true` など）',
      },
    ],
    questions: [
      single(
        '次のコードで、変数 `age` の型はどれになりますか？',
        ['string', 'number', 'boolean', '型は決まらない'],
        1,
        '最初に入れた値 `20` が数値なので、型推論によって `number` 型になります。',
        { code: 'let age = 20;' },
      ),
      single(
        '次のうち、エラーになる行はどれですか？',
        ['1 行目', '2 行目', '3 行目', 'どの行もエラーにならない'],
        2,
        "`isDone` は `boolean` 型なので、文字列の `'yes'` は入れられません。",
        {
          code: "let isDone: boolean = false;  // 1 行目\nisDone = true;                // 2 行目\nisDone = 'yes';               // 3 行目",
        },
      ),
      blank(
        '文字列を入れる変数になるように、型注釈を埋めてください。',
        `
let message: ____ = 'ようこそ';
`,
        ['string'],
        '文字列の型は `string` です。',
      ),
      single(
        '型推論についての説明として正しいものはどれですか？',
        [
          '型推論を使うと、型の検査が行われなくなる',
          '最初に入れた値から、TypeScript が型を自動で決める',
          'すべての変数に型注釈を書かないとエラーになる',
          '型推論で決まった型は、後から別の型に変わる',
        ],
        1,
        '型推論で決まった型でも、型注釈を書いたときと同じように検査されます。後から別の種類の値を入れるとエラーになります。',
      ),
    ],
  },
  {
    id: 'arrays-and-tuples',
    chapterId: 'basics',
    title: '配列とタプル',
    summary: '同じ種類の値を並べる配列と、位置ごとに型が決まったタプルを学びます。',
    body: [
      p('配列の型は `要素の型[]` と書きます。「number の並び」なら `number[]` です。'),
      code(`
const scores: number[] = [80, 95, 70];
const names: string[] = ['葵', '蓮'];

scores.push(60);     // OK
scores.push('満点'); // エラー: number[] に文字列は入れられない
`),
      p('配列も、最初に入れた値から型が推論されます。'),
      code(`
const tags = ['入門', '基礎']; // string[] と推論される
`),
      h('readonly な配列'),
      p(
        '型の前に `readonly` を付けると、要素の追加や書き換えができない配列になります。「この配列は変更しない」という約束を型で表せます。',
      ),
      code(`
const weekdays: readonly string[] = ['月', '火', '水', '木', '金'];

weekdays.push('土'); // エラー: readonly な配列には追加できない
weekdays[0] = '日';  // エラー: 書き換えもできない
`),
      h('タプル'),
      p(
        '長さと各位置の型が決まっている配列をタプルと呼びます。「1 番目は名前、2 番目は点数」のように、位置に意味がある組を表すときに使います。',
      ),
      code(`
const entry: [string, number] = ['太郎', 80];

const [name, score] = entry; // 分割代入。name は string、score は number

const wrong: [string, number] = [80, '太郎']; // エラー: 順番が違う
`),
    ],
    codeRefs: [
      {
        path: 'apps/api/src/domain/grading.ts',
        description: '問題の一覧を `readonly` な配列で受け取り、書き換えないことを示している',
      },
    ],
    questions: [
      blank(
        '数値の配列になるように、型を埋めてください。',
        `
const prices: ____ = [100, 200, 300];
`,
        ['number[]'],
        '配列の型は `要素の型[]` と書きます。数値の配列は `number[]` です。',
      ),
      single(
        '次のうち、エラーになる行はどれですか？',
        ['1 行目', '2 行目', '3 行目', 'どの行もエラーにならない'],
        2,
        '`colors` は `string[]` と推論されるので、数値の `3` は追加できません。',
        {
          code: "const colors = ['赤', '青'];  // 1 行目\ncolors.push('緑');           // 2 行目\ncolors.push(3);              // 3 行目",
        },
      ),
      single(
        '`[string, number]` という型の説明として正しいものはどれですか？',
        [
          '文字列か数値が、いくつでも入る配列',
          '1 番目が文字列、2 番目が数値の、長さ 2 の配列',
          '文字列をキー、数値を値とするオブジェクト',
          '文字列と数値をつなげた 1 つの文字列',
        ],
        1,
        'これはタプルの型です。長さと、各位置の型が決まっています。',
      ),
      single(
        '`readonly string[]` 型の配列 `days` に対して、エラーにならない操作はどれですか？',
        ["days.push('土')", "days[0] = '日'", 'days.length', 'days.pop()'],
        2,
        '`readonly` な配列は、追加・削除・書き換えができません。`length` を読むことのように、中身を変えない操作はできます。',
      ),
    ],
  },
  {
    id: 'objects-and-interfaces',
    chapterId: 'basics',
    title: 'オブジェクト型と interface',
    summary: 'オブジェクトの形を型で表し、名前を付けて使い回す方法を学びます。',
    body: [
      p(
        'オブジェクトの型は、プロパティの名前と型を `{ }` の中に並べて表します。`type 名前 = ...` と書くと、型に名前を付けて使い回せます（型エイリアス）。',
      ),
      code(`
type User = {
  name: string;
  age: number;
};

const taro: User = { name: '太郎', age: 20 };
const hanako: User = { name: '花子' }; // エラー: age がない
`),
      h('省略できるプロパティ'),
      p('プロパティ名の後ろに `?` を付けると、そのプロパティはあってもなくてもよくなります。'),
      code(`
type Profile = {
  name: string;
  bio?: string; // なくてもよい
};

const a: Profile = { name: '太郎' };                       // OK
const b: Profile = { name: '花子', bio: 'よろしく' };       // OK
`),
      h('readonly なプロパティ'),
      code(`
type Lesson = {
  readonly id: string;
  title: string;
};

const lesson: Lesson = { id: 'basics-1', title: '入門' };
lesson.title = '基礎'; // OK
lesson.id = 'other';   // エラー: readonly なので書き換えられない
`),
      h('interface'),
      p('`interface` を使っても、オブジェクトの形に名前を付けられます。'),
      code(`
interface Book {
  title: string;
  pages: number;
}
`),
      list(
        'オブジェクトの形を表すだけなら、`type` と `interface` はほぼ同じように使える',
        '`type` は、後のレッスンで習う「ユニオン型」など、オブジェクト以外の型にも名前を付けられる',
        'チームの中でどちらかに揃えるのが大切。このアプリは `type` に揃えている',
      ),
      h('形が合えば代入できる（構造的型付け）'),
      p(
        'TypeScript は、型の名前ではなく「形」で、代入できるかを判断します。必要なプロパティがそろっていれば、別の名前の型の値でも代入できます。',
      ),
      code(`
type HasName = { name: string };

const user = { name: '太郎', age: 20 };
const target: HasName = user; // OK: name を持っているので代入できる
`),
    ],
    codeRefs: [
      {
        path: 'apps/api/src/env.ts',
        description: 'Worker の設定やリクエストごとの値を、オブジェクト型で定義している',
      },
      {
        path: 'packages/shared/src/schemas/note.ts',
        description: 'ノートの形を定義している（第4章の Zod を使った書き方）',
      },
    ],
    questions: [
      single(
        '次の型 `Item` に合うオブジェクトはどれですか？',
        [
          "{ name: 'ペン' }",
          "{ name: 'ペン', price: 100 }",
          "{ name: 'ペン', price: '100円' }",
          '{ price: 100 }',
        ],
        1,
        '`name` と `price` の両方が必要で、`price` は数値でなければなりません。',
        { code: 'type Item = {\n  name: string;\n  price: number;\n};' },
      ),
      blank(
        '`createdAt` を書き換えられないようにする修飾子を埋めてください。',
        `
type Post = {
  ____ createdAt: string;
};
`,
        ['readonly'],
        '`readonly` を付けたプロパティを書き換えようとすると、エラーになります。',
      ),
      single(
        '次の型で、`nickname` についての説明として正しいものはどれですか？',
        [
          '必ず指定しなければならない',
          '指定しなくてもよい',
          '書き換えられない',
          '数値も入れられる',
        ],
        1,
        'プロパティ名の後ろの `?` は、「なくてもよい」という意味です。',
        { code: 'type Member = {\n  name: string;\n  nickname?: string;\n};' },
      ),
      single(
        '`type HasId = { id: string }` のとき、`HasId` 型の変数に代入できるものはどれですか？',
        [
          "{ id: 'a1', title: '入門' } を入れておいた変数",
          "{ title: '入門' } を入れておいた変数",
          '{ id: 1 } を入れておいた変数',
          'どれも代入できない',
        ],
        0,
        '必要な `id`（文字列）を持っていれば、ほかのプロパティがあっても代入できます。TypeScript は形で判断するためです。',
      ),
    ],
  },
  {
    id: 'functions',
    chapterId: 'basics',
    title: '関数の型',
    summary: '引数と戻り値に型を付けて、関数の使い方の間違いを防ぎます。',
    body: [
      p(
        '関数では、引数と戻り値に型を書きます。引数は値から型を推論できないので、型注釈が必要です。戻り値の型は `)` の後ろに書きます。',
      ),
      code(`
function add(a: number, b: number): number {
  return a + b;
}

add(1, 2);    // OK
add('1', 2);  // エラー: 1 番目の引数は number
add(1);       // エラー: 引数が足りない
`),
      p('アロー関数でも、同じ場所に型を書きます。'),
      code(`
const greet = (name: string): string => \`こんにちは、\${name}さん\`;
`),
      h('何も返さない関数: void'),
      p('値を返さない関数の戻り値の型は `void` です。'),
      code(`
function log(message: string): void {
  console.log(message);
}
`),
      h('既定値と、省略できる引数'),
      p(
        '引数に既定値を書くと、呼び出すときに省略できます。型は既定値から推論されます。また、引数名の後ろに `?` を付けると、既定値なしで省略できる引数になります。',
      ),
      code(`
function repeat(text: string, times = 2): string {
  // times は number と推論される
  return text.repeat(times);
}

repeat('あ');    // 'ああ'
repeat('あ', 3); // 'あああ'

function welcome(name: string, title?: string): string {
  // title を省略して呼ぶと、title の値は undefined になる
  return title ? \`\${title} \${name}\` : name;
}
`),
      info(
        '省略できる引数の詳しい扱いは、この章の最後の「null・undefined と絞り込みの基本」で学びます。迷ったら既定値を使う書き方がおすすめです。',
      ),
      h('関数そのものの型'),
      p(
        '関数も値なので、型で表せます。`(引数: 型) => 戻り値の型` と書きます。関数を受け取る関数を書くときによく使います。',
      ),
      code(`
type Calc = (a: number, b: number) => number;

const multiply: Calc = (a, b) => a * b; // a と b の型は Calc から決まる
`),
    ],
    codeRefs: [
      {
        path: 'apps/api/src/domain/streak.ts',
        description: '既定値つきの引数を持つ関数 `calculateStreak`',
      },
      {
        path: 'apps/api/src/lib/npm-registry.ts',
        description: '関数の型 `FetchLike` を定義し、関数を引数で受け取っている',
      },
    ],
    questions: [
      single(
        '次の関数 `add` を呼び出したとき、エラーになるものはどれですか？',
        ['add(1, 2)', 'add(0, -5)', "add('1', 2)", 'add(1.5, 2.5)'],
        2,
        "引数は 2 つとも `number` 型です。文字列の `'1'` は渡せません。",
        { code: 'function add(a: number, b: number): number {\n  return a + b;\n}' },
      ),
      blank(
        '何も返さない関数の戻り値の型を埋めてください。',
        `
function notify(message: string): ____ {
  console.log(message);
}
`,
        ['void'],
        '値を返さない関数の戻り値の型は `void` です。',
      ),
      single(
        '次の関数で、引数 `times` の型はどれになりますか？',
        ['string', 'number', 'boolean', '型は決まらない'],
        1,
        '既定値 `2` から、`times` の型は `number` と推論されます。',
        { code: 'function repeat(text: string, times = 2) {\n  return text.repeat(times);\n}' },
      ),
      single(
        '`type Check = (value: string) => boolean` に合う関数はどれですか？',
        [
          '(value: string) => value.length > 0',
          '(value: number) => value > 0',
          '(value: string) => value.length',
          '() => 0',
        ],
        0,
        '文字列を受け取り、真偽値（`true` か `false`）を返す関数だけが合います。`value.length` は数値を返すので合いません。',
      ),
    ],
  },
  {
    id: 'unions-and-literals',
    chapterId: 'basics',
    title: 'ユニオン型とリテラル型',
    summary: '「A または B」を表すユニオン型と、決まった値だけを許すリテラル型を学びます。',
    body: [
      p('`|`（縦棒）で型をつなぐと、「どちらかの型」を表せます。これをユニオン型と呼びます。'),
      code(`
let id: string | number;
id = 'abc'; // OK
id = 123;   // OK
id = true;  // エラー: string でも number でもない
`),
      h('リテラル型'),
      p(
        "`'small'` や `404` のような具体的な値そのものも、型として使えます。これをリテラル型と呼びます。ユニオン型と組み合わせると、取り得る値を列挙できます。",
      ),
      code(`
type Size = 'small' | 'medium' | 'large';

let size: Size = 'small'; // OK
size = 'large';           // OK
size = 'huge';            // エラー: Size に 'huge' はない
`),
      p(
        "「決まった文字列のどれか」を表したい場面はとても多く、入力の間違いを防ぐのに役立ちます。エディタも候補として `'small'` などを出してくれます。",
      ),
      h('const で宣言した値の型'),
      p(
        '`let` で宣言した変数は後から別の値を入れられるので、`string` のような広い型に推論されます。`const` で宣言した変数は値が変わらないので、値そのもののリテラル型に推論されます。',
      ),
      code(`
let a = 'ok';   // string
const b = 'ok'; // 'ok'（リテラル型）
`),
      info(
        "関数の引数などで `Size` のようなリテラル型のユニオンを使うと、`'small'` 以外の文字列を渡す間違いを、実行する前に見つけられます。",
      ),
    ],
    codeRefs: [
      {
        path: 'packages/shared/src/errors.ts',
        description: 'エラーの種類 `ErrorCode` を、リテラル型のユニオンとして定義している',
      },
    ],
    questions: [
      single(
        "`type Size = 's' | 'm' | 'l'` のとき、エラーになるのはどれですか？",
        [
          "const a: Size = 's'",
          "const b: Size = 'xl'",
          "const c: Size = 'm'",
          "const d: Size = 'l'",
        ],
        1,
        "`'xl'` は Size に含まれないため、入れられません。",
      ),
      blank(
        '文字列か数値のどちらかを入れられる型になるように、記号を埋めてください。',
        `
let code: string ____ number;
`,
        ['|'],
        '`|` で型をつなぐと、「どちらかの型」を表すユニオン型になります。',
      ),
      single(
        '次のコードで、変数 `label` の型はどれになりますか？',
        ['string', "'ready'", 'boolean', '型は決まらない'],
        1,
        "`const` で宣言した変数は値が変わらないため、値そのもののリテラル型 `'ready'` に推論されます。`let` なら `string` です。",
        { code: "const label = 'ready';" },
      ),
      multi(
        '`let value: string | number` に入れられる値をすべて選んでください。',
        ["'こんにちは'", '42', 'true', '3.14'],
        [0, 1, 3],
        '文字列と数値は入れられます。`true` は boolean なので入れられません。',
      ),
    ],
  },
  {
    id: 'null-and-narrowing',
    chapterId: 'basics',
    title: 'null・undefined と絞り込みの基本',
    summary: '「値がないかもしれない」を型で表し、安全に使う方法を学びます。',
    body: [
      p(
        'JavaScript には「値がない」ことを表す `null` と `undefined` があります。TypeScript では、これらも型として扱います。「値がないかもしれない」ことは、ユニオン型で `string | null` のように表します。',
      ),
      code(`
function findTitle(id: string): string | null {
  if (id === 'basics') {
    return '基礎';
  }
  return null; // 見つからなかった
}

const title = findTitle('x');
title.length; // エラー: title は null かもしれない
`),
      p(
        'このアプリの設定（`strict`）では、`null` の可能性を確かめないままプロパティを使うと、エラーになります。実行中に「null のプロパティは読めない」というよくある不具合を、実行する前に防げます。',
      ),
      h('if で確かめると、型が絞り込まれる'),
      p(
        '`if` で `null` でないことを確かめると、そのブロックの中では TypeScript が型を `string` に絞り込みます。これを「型の絞り込み」と呼びます。',
      ),
      code(`
const title = findTitle('basics');

if (title !== null) {
  console.log(title.length); // ここでは string なので OK
}
`),
      p('`typeof` を使うと、ユニオン型の値がどの型なのかを確かめて絞り込めます。'),
      code(`
function format(value: string | number): string {
  if (typeof value === 'string') {
    return value.toUpperCase(); // ここでは string
  }
  return value.toFixed(1);      // ここでは number
}
`),
      h('?. と ?? を使う'),
      p('第0章で見た `?.` と `??` も、`null` や `undefined` を安全に扱うための書き方です。'),
      code(`
const title = findTitle('x');

title?.length;        // title が null なら undefined（エラーにならない）
title ?? '（なし）';  // title が null なら '（なし）'
`),
      h('undefined が付く場所'),
      list(
        '省略できるプロパティ（`bio?: string`）の型は `string | undefined` になる',
        '省略できる引数（`title?: string`）の型も `string | undefined` になる',
        'このアプリの設定では、配列の要素を `scores[0]` のように取り出すと `number | undefined` になる。その位置に要素がないかもしれないため',
      ),
      code(`
const scores: number[] = [80, 95];
const first = scores[0]; // number | undefined

if (first !== undefined) {
  console.log(first.toFixed(1)); // ここでは number
}
`),
      warn(
        'どれも「値がないかもしれない」ことを型が教えてくれています。エラーを消すためだけに無理やり型を変えるのではなく、`if` や `??` で「ないとき」の扱いを書きましょう。',
      ),
    ],
    codeRefs: [
      {
        path: 'apps/api/src/services/lesson-service.ts',
        description: '`summaries[index - 1]?.id ?? null` と、配列の要素の undefined を扱っている',
      },
      {
        path: 'packages/shared/src/schemas/note.ts',
        description:
          'ノートの `lessonId` は「レッスンに紐付かない」場合があるので null を許している',
      },
    ],
    questions: [
      single(
        '次のコードで、エラーになる行はどれですか？',
        ['1 行目', '2 行目', '3 行目', 'どの行もエラーにならない'],
        1,
        '`name` は `null` かもしれないので、確かめずに `.length` を使うとエラーになります。3 行目は `?.` を使っているのでエラーになりません。',
        {
          code: 'const name: string | null = findName();  // 1 行目\nname.length;                              // 2 行目\nname?.length;                             // 3 行目',
        },
      ),
      blank(
        '`title` が null のときに代わりの文字列を使う演算子を埋めてください。',
        `
const title: string | null = findTitle(id);
const label = title ____ '（なし）';
`,
        ['??'],
        '`??` は、左側が null か undefined のときだけ右側の値を使います。',
      ),
      single(
        "次の関数で、`if (typeof value === 'string')` のブロックの中の `value` の型はどれですか？",
        ['string | number', 'string', 'number', 'boolean'],
        1,
        '`typeof` で確かめると、そのブロックの中では型が `string` に絞り込まれます。',
        {
          code: "function show(value: string | number) {\n  if (typeof value === 'string') {\n    // ここ\n  }\n}",
        },
      ),
      single(
        '`type Profile = { name: string; bio?: string }` のとき、`profile.bio` の型はどれですか？',
        ['string', 'string | undefined', 'string | null', 'undefined'],
        1,
        '`?` の付いた省略できるプロパティは、ないこともあるので `undefined` が加わります。',
      ),
    ],
  },
];
