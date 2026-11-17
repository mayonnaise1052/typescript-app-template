import { blank, code, h, info, list, p, single, type LessonContent } from './types';

/**
 * 第0章 はじめに。
 *
 * TypeScript をはじめて学ぶ人向けの章です。型の文法はほとんど使わず、
 * 「TypeScript が何をしてくれるのか」と、教材で使う JavaScript の書き方を確認します。
 * 書いてよい内容の範囲は docs/specs/0005-beginner-friendly-curriculum.md の 2.3 を参照してください。
 */
export const intro: LessonContent[] = [
  {
    id: 'what-is-typescript',
    chapterId: 'intro',
    title: 'TypeScript とは',
    summary: 'TypeScript が何をしてくれる言語なのか、どこで試せるのかを確認します。',
    body: [
      p(
        'TypeScript は、JavaScript に「型」という仕組みを足した言語です。型とは「この変数には数値が入る」「この関数は文字列を返す」といった、値の種類についての約束のことです。',
      ),
      h('何がうれしいのか'),
      p(
        'JavaScript では、間違いがあってもプログラムを動かすまで気付けないことがよくあります。TypeScript では、書いたコードを実行する前に、型の約束が守られているかを検査します。',
      ),
      code(
        `
let price: number = 100;
price = '百円';
`,
        '`: number` は「price には数値を入れる」という約束です。文字列を入れようとすると、実行する前にエラーになります。',
      ),
      list(
        'タイプミスや、値の種類の取り違えを、実行する前に見つけられる',
        'エディタが「この変数で使えるもの」を候補として出してくれる',
        'コードを読む人が、値の種類をすぐに分かる',
      ),
      h('型は実行するときには消える'),
      p(
        'ブラウザや Node.js が直接動かせるのは JavaScript だけです。TypeScript のコードは、型の検査を受けたあと、型の部分を取り除いた JavaScript に変換されてから動きます。',
      ),
      code(
        `
// TypeScript
let price: number = 100;

// 変換後の JavaScript（型の部分が消える）
let price = 100;
`,
      ),
      info(
        '型は「実行する前に間違いを見つけるための道具」です。型を書いても、プログラムが速くなったり、実行中に値が検査されたりはしません。',
      ),
      h('試してみる場所'),
      p(
        '公式サイトの Playground（https://www.typescriptlang.org/play ）では、インストールなしでブラウザから TypeScript を試せます。左にコードを書くと、エラーには赤い波線が付き、右側に変換後の JavaScript が表示されます。教材のコードを貼り付けて、わざと間違えてみると理解が深まります。',
      ),
      h('エラーメッセージの読み方'),
      p('上の `price` の例では、次のようなメッセージが出ます。'),
      code(`Type 'string' is not assignable to type 'number'.`),
      p(
        '「string 型の値は、number 型の場所に入れられません」という意味です。`is not assignable to` は「〜に代入できない」と読みます。TypeScript のエラーの多くはこの形なので、覚えておくと読みやすくなります。',
      ),
    ],
    codeRefs: [
      {
        path: 'package.json',
        description:
          '`typecheck` スクリプト。このアプリでは `npm run typecheck` で、すべてのコードの型を検査します',
      },
      {
        path: '.githooks/pre-commit',
        description: 'コミットする前に型の検査を自動で行い、エラーがあればコミットを止める仕組み',
      },
    ],
    questions: [
      single(
        'TypeScript が型を検査するのはいつですか？',
        [
          'プログラムを実行している最中',
          'プログラムを実行する前',
          'プログラムを実行し終わった後',
          'ブラウザに表示されたとき',
        ],
        1,
        'TypeScript は、コードを JavaScript に変換する前に型を検査します。そのため、実行する前に間違いに気付けます。',
      ),
      single(
        '次の TypeScript のコードを JavaScript に変換すると、どうなりますか？',
        [
          'let count: number = 1;',
          'let count = 1;',
          'let count = number(1);',
          '変換できずにエラーになる',
        ],
        1,
        '変換すると型の部分（`: number`）が取り除かれます。型は実行するときには残りません。',
        { code: 'let count: number = 1;' },
      ),
      single(
        "エラーメッセージ `Type 'number' is not assignable to type 'string'.` の意味として正しいものはどれですか？",
        [
          'string 型の値を、number 型の場所に入れようとしている',
          'number 型の値を、string 型の場所に入れようとしている',
          'number 型と string 型を足し算しようとしている',
          'string 型という型は存在しない',
        ],
        1,
        '`A is not assignable to B` は「A 型の値は B 型の場所に入れられない」という意味です。ここでは、数値を文字列用の変数などに入れようとしています。',
      ),
    ],
  },
  {
    id: 'javascript-refresher',
    chapterId: 'intro',
    title: 'このアプリで使う JavaScript のおさらい',
    summary: '教材のコードに出てくる JavaScript の書き方を、型を使わずに確認します。',
    body: [
      p(
        'TypeScript のコードの大部分は、普通の JavaScript です。このレッスンでは、教材でよく使う JavaScript の書き方をまとめて確認します。知っているものは読み飛ばしてかまいません。',
      ),
      h('const と let'),
      code(`
const siteName = 'TypeQuest'; // 後から別の値を入れられない
let count = 0;                // 後から別の値を入れられる
count = count + 1;
`),
      p('基本は `const` を使い、値を入れ直す必要があるときだけ `let` を使います。'),
      h('アロー関数'),
      code(`
function double(x) {
  return x * 2;
}

// 同じ意味のアロー関数
const double2 = (x) => x * 2;
`),
      h('テンプレート文字列'),
      p('バッククォート（`）で囲むと、`${...}` の中に変数や式を埋め込めます。'),
      code(`
const name = '花子';
const message = \`こんにちは、\${name}さん\`; // 'こんにちは、花子さん'
`),
      h('分割代入'),
      p('オブジェクトや配列から、値を取り出して変数に入れる書き方です。'),
      code(`
const user = { name: '太郎', age: 20 };
const { name, age } = user; // name は '太郎'、age は 20

const scores = [80, 95];
const [first, second] = scores; // first は 80、second は 95
`),
      h('スプレッド構文'),
      p('`...` を付けると、配列やオブジェクトの中身を広げて、新しい配列やオブジェクトを作れます。'),
      code(`
const base = { name: '太郎', age: 20 };
const older = { ...base, age: 21 }; // { name: '太郎', age: 21 }

const more = [...scores, 70];       // [80, 95, 70]
`),
      h('map と filter'),
      code(`
const prices = [100, 250, 400];
const withTax = prices.map((price) => price * 1.1); // すべての要素を変換する
const cheap = prices.filter((price) => price < 300); // 条件に合う要素だけ残す → [100, 250]
`),
      h('?. と ??'),
      p(
        '`?.`（オプショナルチェーン）は、値が `null` や `undefined` のときに、エラーにせず `undefined` を返します。`??`（Null 合体演算子）は、左側が `null` か `undefined` のときだけ右側の値を使います。',
      ),
      code(`
const profile = null;
profile?.name;          // エラーにならず undefined

const nickname = null;
nickname ?? '名無し';    // '名無し'

const zero = 0;
zero ?? 10;             // 0（null でも undefined でもないので、そのまま）
zero || 10;             // 10（|| は 0 や '' でも右側を使ってしまう）
`),
      info(
        '`??` と `||` の違いは、0 や空文字列の扱いです。「値がないときだけ代わりの値を使う」なら `??` を使います。',
      ),
    ],
    codeRefs: [
      {
        path: 'apps/api/src/services/lesson-service.ts',
        description: '`summaries[index - 1]?.id ?? null` と、`?.` と `??` を組み合わせている',
      },
      {
        path: 'apps/api/src/domain/streak.ts',
        description: 'アロー関数と `map` を使って、学習した日付を変換している',
      },
    ],
    questions: [
      blank(
        '後から別の値を入れられない変数を宣言するキーワードを埋めてください。',
        `
____ siteName = 'TypeQuest';
`,
        ['const'],
        '`const` で宣言した変数には、後から別の値を入れられません。入れ直す必要があるときは `let` を使います。',
      ),
      single(
        '次のコードを実行したとき、`result` はどれになりますか？',
        ['[1, 2, 3]', '[2, 4, 6]', '[2]', '6'],
        1,
        '`map` は、すべての要素に関数を適用した新しい配列を返します。',
        { code: 'const result = [1, 2, 3].map((n) => n * 2);' },
      ),
      single(
        '次のコードを実行したとき、`a` と `b` の値の組み合わせとして正しいものはどれですか？',
        ['a は 0、b は 0', 'a は 0、b は 5', 'a は 5、b は 0', 'a は 5、b は 5'],
        1,
        '`??` は左側が null か undefined のときだけ右側を使うので、0 はそのまま残ります。`||` は 0 も「値がない」とみなして右側の 5 を使います。',
        { code: 'const count = 0;\nconst a = count ?? 5;\nconst b = count || 5;' },
      ),
      single(
        '`const { title } = lesson;` という書き方の説明として正しいものはどれですか？',
        [
          'lesson の title プロパティを取り出して、変数 title に入れる',
          'lesson を title という名前の変数に入れる',
          'lesson に title プロパティを追加する',
          'lesson から title プロパティを削除する',
        ],
        0,
        'これは分割代入です。オブジェクトから同じ名前のプロパティを取り出して、変数に入れます。',
      ),
    ],
  },
];
