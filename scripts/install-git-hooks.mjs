// `npm install` のたびに自動で実行され（package.json の "prepare"）、
// .githooks/ にあるフックを Git に使わせる設定をします。
// Git のリポジトリでない場所（CI のキャッシュなど）では何もしません。
import { execFileSync } from 'node:child_process';

try {
  execFileSync('git', ['rev-parse', '--git-dir'], { stdio: 'ignore' });
  execFileSync('git', ['config', 'core.hooksPath', '.githooks']);
} catch {
  // Git が使えない環境では、フックの設定を飛ばします。
}
