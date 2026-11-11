// 初回セットアップ: ローカル開発用の設定ファイル（apps/api/.dev.vars）を用意します。
// このあと package.json の "setup" スクリプトが、DB のマイグレーションと教材の投入を続けて実行します。
import { copyFileSync, existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const apiDir = resolve(dirname(fileURLToPath(import.meta.url)), '../apps/api');
const target = resolve(apiDir, '.dev.vars');

if (existsSync(target)) {
  console.log('apps/api/.dev.vars はすでに存在するため、そのまま使います。');
} else {
  copyFileSync(resolve(apiDir, '.dev.vars.example'), target);
  console.log('apps/api/.dev.vars を作成しました。');
}
