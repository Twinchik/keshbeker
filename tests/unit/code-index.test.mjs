import { execFileSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, readFileSync, renameSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, expect, it } from 'vitest';
import { indexSource, syncIndex } from '../../scripts/generate-code-map.mjs';

let directory;
afterEach(() => {
  if (directory) rmSync(directory, { recursive: true, force: true });
  directory = undefined;
});

it('индексирует TSX, импорты, экспорты, функции, классы, методы и JSDoc', () => {
  const result = indexSource([
    "import { make } from './maker';",
    '/** Виджет каталога. */',
    'export const Card = ({title}: {title: string}) => <strong>{title}</strong>;',
    'export async function load(id: number) { return make(id); }',
    'const render = function (value = "sensitive-default") { return value; };',
    'class Rules { static async #read(...ids: string[]) {} }',
    'export { make as factory };',
  ].join('\n'), 'src/Card.tsx', 'Учебный модуль');
  expect(result.purpose).toBe('Учебный модуль');
  expect(result.imports).toEqual([{ source: './maker', names: ['make'] }]);
  expect(result.exports).toEqual([{ name: 'Card' }, { name: 'load' }, { name: 'factory' }]);
  expect(result.symbols).toEqual(expect.arrayContaining([
    expect.objectContaining({ name: 'Card', type: 'component', description: 'Виджет каталога.', start: 3, end: 3 }),
    expect.objectContaining({ name: 'load', type: 'function', signature: 'async load(id)' }),
    expect.objectContaining({ name: 'render', type: 'function-expression', signature: 'render(value = …)' }),
    expect.objectContaining({ name: 'Rules', type: 'class' }),
    expect.objectContaining({ name: 'Rules.#read', type: 'method', signature: 'static async Rules.#read(...ids)' }),
  ]));
  expect(JSON.stringify(result)).not.toContain('sensitive-default');
});

it('индексирует функциональные объявления, стрелки и CommonJS в JS/JSX', () => {
  const index = indexSource('const f = async x => x;\nfunction Demo() {\n return <>ok</>;\n}\nmodule.exports = { f, Demo };', 'demo.jsx');
  expect(index.symbols).toEqual(expect.arrayContaining([
    expect.objectContaining({ name: 'f', type: 'arrow', signature: 'async f(x)' }),
    expect.objectContaining({ name: 'Demo', type: 'component', start: 2, end: 4 }),
  ]));
  expect(index.exports.map(entry => entry.name)).toEqual(['f', 'Demo']);
});

it('детерминированно проверяет смену файлов, исключает артефакты и связывает явный тест', () => {
  directory = mkdtempSync(path.join(tmpdir(), 'keshbeker-index-'));
  execFileSync('git', ['init', '--quiet', directory]);
  for (const dir of ['src', 'src/dist', 'tests/unit', 'ocr', 'node_modules']) mkdirSync(path.join(directory, dir), { recursive: true });
  const write = (file, contents) => writeFileSync(path.join(directory, file), contents);
  write('src/old.ts', 'export const total = (p: number) => p;');
  write('tests/unit/total.test.mjs', "import { total } from '../../src/old.ts';");
  for (const excluded of ['src/dist/generated.js', 'src/lib.min.js', 'src/credentials.js', 'src/.env.js', 'ocr/a.js', 'node_modules/lib.js']) write(excluded, 'invalid JS');
  write('src/image.js', Buffer.from([0, 255]));
  symlinkSync('old.ts', path.join(directory, 'src/link.ts'));
  const first = syncIndex(directory);
  expect(first).toMatchObject({ files: 1, symbols: 2 });
  const indexFile = path.join(directory, 'docs/code-index/src%2Fold.ts.json');
  const content = readFileSync(indexFile, 'utf8');
  expect(JSON.parse(content).symbols.find(symbol => symbol.type === 'arrow').tests).toEqual(['tests/unit/total.test.mjs']);
  expect(syncIndex(directory)).toMatchObject({ changed: [] });
  expect(readFileSync(indexFile, 'utf8')).toBe(content);
  renameSync(path.join(directory, 'src/old.ts'), path.join(directory, 'src/new.ts'));
  expect(syncIndex(directory, { check: true }).changed).toEqual(['src%2Fnew.ts.json', 'src%2Fold.ts.json']);
  expect(readFileSync(indexFile, 'utf8')).toBe(content);
  syncIndex(directory);
  expect(() => readFileSync(indexFile)).toThrow(/ENOENT/);
  expect(syncIndex(directory, { check: true }).changed).toEqual([]);
});
