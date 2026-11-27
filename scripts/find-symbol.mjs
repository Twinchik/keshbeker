import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { indexDir, root } from './generate-code-map.mjs';

const args = process.argv.slice(2);
const byFile = args[0] === '--file';
if (args.length !== (byFile ? 2 : 1) || !args.at(-1)?.trim() || (!byFile && args[0].startsWith('-'))) {
  console.error('Использование: npm run code:find -- NAME | --file PATH');
  process.exit(2);
}
const directory = path.join(root, indexDir);
const requested = byFile ? path.relative(root, path.resolve(args[1])).split(path.sep).join('/') : '';
const names = byFile ? [encodeURIComponent(requested) + '.json'] : readdirSync(directory).filter(name => name.endsWith('.json')).sort();
const query = args[0].toLowerCase();
let count = 0;
for (const name of names) {
  let module;
  try {
    module = JSON.parse(readFileSync(path.join(directory, name), 'utf8'));
  } catch (error) {
    if (error.code === 'ENOENT' && byFile) continue;
    throw error;
  }
  for (const symbol of module.symbols) {
    if (!byFile && !symbol.name.toLowerCase().includes(query)) continue;
    console.log(`${module.file}:${symbol.start}-${symbol.end} | ${symbol.name} | ${symbol.type}`);
    count++;
  }
}
if (!count) {
  console.error('Символы не найдены. Проверьте запрос и актуальность индекса.');
  process.exitCode = 1;
}
