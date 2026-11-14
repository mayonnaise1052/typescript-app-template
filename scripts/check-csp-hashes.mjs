// CSP（apps/web/public/_headers の style-src）に、sonner が挿入する CSS のハッシュが
// 正しく書かれているかを検査します。
//
// sonner は読み込み時に <style> 要素を追加して、自分の CSS を入れます。このアプリの CSP は
// インラインのスタイルを禁止しているので、その CSS の中身の指紋（SHA-256）だけを許可しています
// （docs/specs/0003-shadcn-ui-official-components.md の 3 章）。
// sonner を更新して CSS が変わると、許可が外れて通知の見た目が崩れるため、CI でこの検査を行います。
//
// 使い方:
//   node scripts/check-csp-hashes.mjs          検査だけ行う（ずれていれば失敗する）
//   node scripts/check-csp-hashes.mjs --write  _headers のハッシュを正しい値に書き換える
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const headersPath = resolve(root, 'apps/web/public/_headers');
const require = createRequire(resolve(root, 'apps/web/package.json'));

/** CSP のハッシュの書式: 'sha256-<Base64>' */
function cspHash(text) {
  return `'sha256-${createHash('sha256').update(text, 'utf8').digest('base64')}'`;
}

/** sonner の配布ファイルから、__insertCSS("...") に渡している CSS の文字列を取り出します。 */
function sonnerCss() {
  const entry = require.resolve('sonner');
  const source = readFileSync(entry.replace(/index\.(c?js|mjs)$/, 'index.mjs'), 'utf8');
  const calls = [...source.matchAll(/__insertCSS\(("(?:[^"\\]|\\.)*")\)/g)];
  if (calls.length !== 1) {
    throw new Error(
      `sonner の CSS の挿入箇所が ${calls.length} か所見つかりました（1 か所の想定）`,
    );
  }
  // 文字列リテラルを JSON として読むと、エスケープが解かれた実際の値になります。
  return JSON.parse(calls[0][1]);
}

// sonner は空の <style> 要素を先に追加してから中身を入れるので、空文字列のハッシュも必要です。
const expected = [cspHash(''), cspHash(sonnerCss())];

const headers = readFileSync(headersPath, 'utf8');
const match = /style-src ([^;]*);/.exec(headers);
if (!match) throw new Error(`${headersPath} に style-src が見つかりません`);

const current = match[1].split(/\s+/).filter((token) => token.startsWith("'sha256-"));
const ok = expected.every((hash) => current.includes(hash)) && current.length === expected.length;

if (ok) {
  console.log('✓ CSP の style-src に、sonner の CSS のハッシュが正しく書かれています');
  process.exit(0);
}

const fixed = headers.replace(/style-src [^;]*;/, `style-src 'self' ${expected.join(' ')};`);
if (process.argv.includes('--write')) {
  writeFileSync(headersPath, fixed);
  console.log('✓ apps/web/public/_headers の style-src を更新しました');
  process.exit(0);
}

console.error(
  [
    '✗ CSP の style-src にある sonner の CSS のハッシュが、インストール済みの sonner と一致しません。',
    `  期待する値: ${expected.join(' ')}`,
    `  現在の値:   ${current.join(' ') || '（なし）'}`,
    '  sonner を更新した場合は、`node scripts/check-csp-hashes.mjs --write` で書き換えてください。',
  ].join('\n'),
);
process.exit(1);
