import { parse } from '@babel/parser';
import { readFileSync, readdirSync } from 'node:fs';
import globals from 'globals';

// index.html loads classic scripts into a shared browser scope.
const directory = new URL('./js/', import.meta.url);
const shared = Object.fromEntries(readdirSync(directory).filter(file => file.endsWith('.js')).flatMap(file => {
  const source = readFileSync(new URL(file, directory), 'utf8');
  return parse(source).program.body.flatMap(node => {
    if (node.type === 'VariableDeclaration') {
      return node.declarations.filter(decl => decl.id.type === 'Identifier').map(decl => [decl.id.name, node.kind !== 'const']);
    }
    return node.id ? [[node.id.name, false]] : [];
  });
}));
const syntaxRules = {
  'no-undef': 'error',
  'no-unreachable': 'error',
  'no-dupe-args': 'error',
  'no-dupe-keys': 'error',
  'no-duplicate-case': 'error',
  'no-constant-condition': ['error', { checkLoops: false }],
};

export default [
  { ignores: ['coverage/**', 'playwright-report/**', 'test-results/**', 'docs/code-index/**'] },
  {
    files: ['js/*.js', 'sw.js'],
    languageOptions: {
      sourceType: 'script',
      globals: { ...globals.browser, ...globals.serviceworker, ...shared, module: 'readonly', ym: 'writable' },
    },
    rules: syntaxRules,
  },
  {
    files: ['**/*.mjs'],
    languageOptions: { globals: globals.node },
    rules: { ...syntaxRules, 'no-unused-vars': ['error', { argsIgnorePattern: '^_' }] },
  },
  {
    files: ['tests/e2e/*.mjs'],
    languageOptions: { globals: globals.browser },
  },
];
