import { execFileSync, spawnSync } from 'node:child_process';
import { expect, it } from 'vitest';

const cli = (args) => ['scripts/find-symbol.mjs', ...args];

it('находит часть имени и выводит компактную строку с диапазоном', () => {
  const result = execFileSync(process.execPath, cli(['rankCard']), { encoding: 'utf8' });
  expect(result).toMatch(/^js\/data\.js:\d+-\d+ \| rankCard \| function$/m);
});

it('находит символы заданного файла и сообщает о пропущенном имени', () => {
  const result = execFileSync(process.execPath, cli(['--file', 'js/scan.js']), { encoding: 'utf8' });
  expect(result).toMatch(/\| parseCashback \| function/);
  expect(result.trim().split('\n').every(line => line.startsWith('js/scan.js:'))).toBe(true);
  expect(spawnSync(process.execPath, cli(['NoMatchingDemoSymbol'])).status).toBe(1);
});
