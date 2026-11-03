// 生成 sw.js 的缓存文件列表：node tools/gen-sw.mjs
import { readdirSync, statSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { createHash } from 'node:crypto';

const walk = (d) => readdirSync(d).flatMap((f) => {
  const p = join(d, f);
  return statSync(p).isDirectory() ? walk(p) : [p];
});
const files = ['index.html', 'manifest.webmanifest', 'icon.svg', ...walk('css'), ...walk('js')].sort();
const hash = createHash('sha1');
files.forEach((f) => hash.update(readFileSync(f)));
const version = 'tp-' + hash.digest('hex').slice(0, 10);
const tpl = readFileSync('tools/sw.template.js', 'utf8')
  .replace('__VERSION__', version)
  .replace('__FILES__', ['./', ...files.map((f) => './' + f)].map((f) => JSON.stringify(f)).join(',\n  '));
writeFileSync('sw.js', tpl);
console.log(`sw.js: ${files.length} files, ${version}`);
