/**
 * 教材から seed.sql を生成する Node スクリプト（`npm run db:seed` から実行されます）。
 *
 * Workers ではなく Node で動くので、ここでは fs などの Node 固有 API を使えます。
 */
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { LESSONS } from '../src/content/index';
import { buildSeedStatements } from '../src/db/seed';

const apiRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const repoRoot = resolve(apiRoot, '../..');

/**
 * wrangler の --file はプレースホルダを使えないため、値を SQL リテラルに変換します。
 * 文字列は ' を '' に置き換えてエスケープします。入力は自分たちが書いた教材だけで、
 * ユーザーの入力を SQL に埋め込むことはありません。
 */
function toSqlLiteral(value: string | number): string {
  return typeof value === 'number' ? String(value) : `'${value.replaceAll("'", "''")}'`;
}

function inlineParams(sql: string, params: readonly (string | number)[]): string {
  let index = 0;
  const inlined = sql.replace(/\?/g, () => {
    const value = params[index++];
    if (value === undefined) throw new Error('プレースホルダの数と値の数が一致しません');
    return toSqlLiteral(value);
  });
  if (index !== params.length) throw new Error('プレースホルダの数と値の数が一致しません');
  return inlined.replace(/\s*\n\s*/g, ' ');
}

// 教材が参照しているファイルが実在するかを確かめます（リンク切れの防止）。
const missing = LESSONS.flatMap((lesson) =>
  lesson.codeRefs
    .filter((ref) => !existsSync(resolve(repoRoot, ref.path)))
    .map((ref) => `${lesson.id}: ${ref.path}`),
);
if (missing.length > 0) {
  console.error(`教材が参照しているファイルが見つかりません:\n${missing.join('\n')}`);
  process.exit(1);
}

const statements = buildSeedStatements(LESSONS);
const sql = statements.map(({ sql, params }) => `${inlineParams(sql, params)};`).join('\n');

const outFile = resolve(apiRoot, '.generated/seed.sql');
mkdirSync(dirname(outFile), { recursive: true });
writeFileSync(outFile, `${sql}\n`);

const questionCount = LESSONS.reduce((sum, lesson) => sum + lesson.questions.length, 0);
console.log(`seed.sql を生成しました（レッスン ${LESSONS.length} 件、問題 ${questionCount} 件）`);
