import { parse } from '@babel/parser';
import { isUtf8 } from 'node:buffer';
import { execFileSync } from 'node:child_process';
import { lstatSync, mkdirSync, readFileSync, readdirSync, unlinkSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const root = fileURLToPath(new URL('../', import.meta.url));
export const indexDir = 'docs/code-index';
const extension = /\.(?:[cm]?[jt]s|[jt]sx)$/;
const sourceRoot = /^(?:(?:js|src|app|mobile|scripts)\/|[^/]+$)/;
const excluded = /(?:^|\/)(?:node_modules|\.[^/]+|dist|build|out|coverage|vendor|ocr|assets|images|secrets?|credentials?|test-results)(?:\/|$)|(?:^|\/)(?:[^/]+\.)?(?:min|bundle|generated)\.[^/]+$|(?:^|\/)[^/]*(?:secret|credential|private[-_]?key)[^/]*$/i;
const functionTypes = new Set(['FunctionDeclaration', 'FunctionExpression', 'ArrowFunctionExpression', 'ObjectMethod', 'ClassMethod', 'ClassPrivateMethod']);
const transparent = new Set(['ExportNamedDeclaration', 'ExportDefaultDeclaration', 'VariableDeclaration', 'VariableDeclarator', 'ExpressionStatement']);

function nameOf(node) {
  if (!node) return '';
  if (node.type === 'PrivateName') return '#' + nameOf(node.id);
  if (node.type === 'MemberExpression' && !node.computed) return [nameOf(node.object), nameOf(node.property)].filter(Boolean).join('.');
  return ['Identifier', 'StringLiteral', 'JSXIdentifier'].includes(node.type) ? node.name ?? node.value : '';
}

function parameter(node) {
  if (node.type === 'AssignmentPattern') return parameter(node.left) + ' = …';
  if (node.type === 'RestElement') return '...' + parameter(node.argument);
  if (node.type === 'TSParameterProperty') return parameter(node.parameter);
  return nameOf(node) + (node.optional ? '?' : '') || (node.type === 'ArrayPattern' ? '[…]' : '{…}');
}

function summary(comments) {
  const comment = comments?.filter(comment => comment.type === 'CommentBlock' && comment.value.startsWith('*')).at(-1);
  return comment?.value.split('\n').map(line => line.replace(/^\s*\*\s?/, '').trim()).filter(Boolean)
    .join(' ').split(/\s*@\w/)[0].trim() || '';
}

function parseFile(source, file) {
  const plugins = ['decorators-legacy'];
  if (/\.[cm]?tsx?$/.test(file)) plugins.push('typescript');
  if (/\.(?:[cm]?js|jsx|tsx)$/.test(file)) plugins.push('jsx');
  return parse(source, { sourceType: 'unambiguous', sourceFilename: file, plugins });
}

// Traverse syntax nodes only. Metadata and comments are attached to their owners.
function walk(node, visit, ancestors = []) {
  if (visit(node, ancestors) === false) return;
  const parents = [...ancestors, node];
  for (const [key, value] of Object.entries(node)) {
    if (key.endsWith('Comments') || key === 'tokens') continue;
    if (Array.isArray(value)) {
      for (const child of value) if (child?.type) walk(child, visit, parents);
    } else if (value?.type) walk(value, visit, parents);
  }
}

function bindingNames(node) {
  if (!node) return [];
  if (node.type === 'Identifier') return [node.name];
  if (node.type === 'AssignmentPattern') return bindingNames(node.left);
  if (node.type === 'RestElement') return bindingNames(node.argument);
  if (node.type === 'ObjectPattern') return node.properties.flatMap(prop => bindingNames(prop.value ?? prop));
  if (node.type === 'ArrayPattern') return node.elements.flatMap(bindingNames);
  return [];
}

function symbolIdentity(node, parent) {
  const key = node.computed ? '' : nameOf(node.key);
  const binding = parent?.type === 'VariableDeclarator' ? nameOf(parent.id)
    : parent?.type === 'AssignmentExpression' ? nameOf(parent.left)
    : parent?.type === 'ObjectProperty' || /^(?:ClassProperty|ClassPrivateProperty)$/.test(parent?.type) ? nameOf(parent.key) : '';
  return binding || nameOf(node.id) || key || (parent?.type === 'ExportDefaultDeclaration' ? 'default' : '');
}

function isComponent(node, name) {
  if (!/^[A-Z]/.test(name) || !node.body) return false;
  let hasJsx = false;
  walk(node.body, child => {
    if (child !== node.body && functionTypes.has(child.type)) return false;
    if (['JSXElement', 'JSXFragment'].includes(child.type)) hasJsx = true;
    return !hasJsx;
  });
  return hasJsx;
}

export function indexSource(source, file, purpose = '') {
  const ast = parseFile(source, file);
  const result = { file, purpose: purpose || ast.comments.find(comment => /@(?:file|module)\b/.test(comment.value))?.value
    .replace(/^[\s*]*@(?:file|module)\s*/gm, '').replace(/^\s*\*\s?/gm, '').trim() || '', imports: [], exports: [], symbols: [] };
  const add = (node, name, type, signature, description = '') => {
    result.symbols.push({ name, type, file, start: node.loc.start.line, end: node.loc.end.line, signature, description, tests: [] });
  };

  walk(ast.program, (node, ancestors) => {
    const parent = ancestors.at(-1);
    const type = node.type;
    if (type === 'ImportDeclaration') {
      const names = node.specifiers.map(specifier => nameOf(specifier.local));
      result.imports.push({ source: node.source.value, names });
      add(node, names.join(', ') || node.source.value, 'import', 'import from ' + node.source.value);
    }
    if (type === 'CallExpression' && ['Import', 'Identifier'].includes(node.callee.type)
        && (node.callee.type === 'Import' || node.callee.name === 'require') && node.arguments[0]?.type === 'StringLiteral') {
      const sourceName = node.arguments[0].value;
      const kind = node.callee.type === 'Import' ? 'dynamic-import' : 'require';
      result.imports.push({ source: sourceName, names: [] });
      add(node, sourceName, 'import', kind + '(' + sourceName + ')');
    }

    let exported = [];
    if (type === 'ExportDefaultDeclaration') exported = ['default'];
    if (type === 'ExportAllDeclaration') exported = ['*'];
    if (type === 'ExportNamedDeclaration') {
      exported = node.specifiers.map(specifier => nameOf(specifier.exported));
      if (node.declaration?.type === 'VariableDeclaration') exported.push(...node.declaration.declarations.flatMap(decl => bindingNames(decl.id)));
      else if (node.declaration?.id) exported.push(nameOf(node.declaration.id));
    }
    if (type === 'AssignmentExpression') {
      const target = nameOf(node.left);
      if (target === 'module.exports') exported = node.right.type === 'ObjectExpression'
        ? node.right.properties.filter(prop => !prop.computed).map(prop => nameOf(prop.key)).filter(Boolean) : ['module.exports'];
      else if (/^(?:module\.)?exports\./.test(target)) exported = [target.split('.').at(-1)];
    }
    for (const name of exported) {
      result.exports.push({ name, ...(node.source && { source: node.source.value }) });
      add(node, name, 'export', 'export ' + name);
    }

    const isClass = type === 'ClassDeclaration' || type === 'ClassExpression';
    if (!isClass && !functionTypes.has(type)) return;
    const name = symbolIdentity(node, parent);
    if (!name) return;
    const owner = ancestors.findLast(candidate => /^(?:ClassDeclaration|ClassExpression)$/.test(candidate.type));
    const qualified = /^(?:ClassMethod|ClassPrivateMethod)$/.test(type) && owner?.id ? nameOf(owner.id) + '.' + name : name;
    const reactClass = isClass && /^(?:React\.)?(?:Pure)?Component$/.test(nameOf(node.superClass));
    const kind = reactClass || (!isClass && isComponent(node, name)) ? 'component'
      : isClass ? 'class'
      : type.endsWith('Method') ? 'method'
      : type === 'ArrowFunctionExpression' ? 'arrow'
      : type === 'FunctionExpression' ? 'function-expression' : 'function';
    const prefix = [node.static && 'static', node.async && 'async', node.generator && '*', ['get', 'set'].includes(node.kind) && node.kind].filter(Boolean).join(' ');
    const signature = isClass ? 'class ' + name : [prefix, qualified + '(' + node.params.map(parameter).join(', ') + ')'].filter(Boolean).join(' ');
    let description = summary(node.leadingComments);
    for (const ancestor of ancestors.toReversed()) {
      if (description || !transparent.has(ancestor.type)) break;
      description = summary(ancestor.leadingComments);
    }
    add(node, qualified, kind, signature, description);
  });
  return result;
}

function fileList(base) {
  return [...new Set(execFileSync('git', ['ls-files', '-z', '--cached', '--others', '--exclude-standard'], { cwd: base, encoding: 'utf8' }).split('\0'))]
    .filter(Boolean).sort();
}

function readSource(base, file) {
  try {
    const filename = path.join(base, file);
    if (!lstatSync(filename).isFile()) return;
    const data = readFileSync(filename);
    if (!data.includes(0) && isUtf8(data)) return data.toString('utf8');
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
  }
}

function moduleDescriptions(base) {
  const overview = readSource(base, 'PROJECT_OVERVIEW.md') ?? '';
  return new Map([...overview.matchAll(/^\| \[[^\]]+\]\(([^)]+)\) \| (.+?) \|$/gm)].map(match => [match[1], match[2]]));
}

function addTestLinks(base, files, modules) {
  for (const file of files.filter(file => /^tests\/.*\.(?:test|spec)\.(?:[cm]?[jt]s|[jt]sx)$/.test(file))) {
    const source = readSource(base, file);
    if (source === undefined) continue;
    const ast = parseFile(source, file);
    for (const comment of ast.comments) {
      const coverage = comment.value.trim().match(/^@covers ([^#\s]+)#([^\s]+)$/);
      if (!coverage) continue;
      const [, target, name] = coverage;
      const matches = modules.get(target)?.symbols.filter(symbol => symbol.name === name && !['import', 'export'].includes(symbol.type));
      if (matches?.length === 1 && !matches[0].tests.includes(file)) matches[0].tests.push(file);
    }
    walk(ast.program, node => {
      if (node.type === 'ImportDeclaration' && node.source.value.startsWith('.')) {
        const target = path.posix.normalize(path.posix.join(path.posix.dirname(file), node.source.value));
        for (const spec of node.specifiers.filter(spec => spec.type === 'ImportSpecifier')) {
          const imported = nameOf(spec.imported);
          const module = modules.get(target);
          const symbols = module?.symbols.filter(symbol => symbol.name === imported && !['import', 'export'].includes(symbol.type));
          if (symbols?.length !== 1 || !module.exports.some(entry => entry.name === imported && !entry.source)) continue;
          if (!symbols[0].tests.includes(file)) symbols[0].tests.push(file);
        }
      }
    });
  }
}

function serializeIndex(module) {
  // Keep array entries on separate lines so each symbol produces a small diff.
  const fields = Object.entries(module).map(([key, value]) => {
    const content = Array.isArray(value) && value.length
      ? '[\n    ' + value.map(entry => JSON.stringify(entry)).join(',\n    ') + '\n  ]'
      : JSON.stringify(value);
    return '  ' + JSON.stringify(key) + ': ' + content;
  });
  return '{\n' + fields.join(',\n') + '\n}\n';
}

export function syncIndex(base = root, { check = false } = {}) {
  const files = fileList(base);
  const purposes = moduleDescriptions(base);
  const modules = new Map();
  for (const file of files.filter(file => extension.test(file) && sourceRoot.test(file) && !excluded.test(file) && !/\.config\./.test(file))) {
    const source = readSource(base, file);
    if (source !== undefined) modules.set(file, indexSource(source, file, purposes.get(file)));
  }
  addTestLinks(base, files, modules);
  const folder = path.join(base, indexDir);
  const expected = new Map([...modules].map(([file, data]) => [encodeURIComponent(file) + '.json', serializeIndex(data)]));
  const changed = [];
  if (!check) mkdirSync(folder, { recursive: true });
  let existing = [];
  try {
    if (!lstatSync(folder).isDirectory()) throw new Error('Каталог индекса должен быть обычным каталогом: ' + folder);
    existing = readdirSync(folder, { withFileTypes: true });
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
  }
  const blocked = existing.filter(entry => expected.has(entry.name) && !entry.isFile());
  if (blocked.length) throw new Error('Пути индекса должны быть обычными файлами: ' + blocked.map(entry => entry.name).join(', '));
  for (const [name, content] of expected) {
    if (readSource(folder, name) === content) continue;
    changed.push(name);
    if (!check) writeFileSync(path.join(folder, name), content);
  }
  for (const entry of existing) {
    if (!entry.isFile() || !entry.name.endsWith('.json') || !extension.test(entry.name.slice(0, -5)) || expected.has(entry.name)) continue;
    changed.push(entry.name);
    if (!check) unlinkSync(path.join(folder, entry.name));
  }
  return { changed, files: modules.size, symbols: [...modules.values()].reduce((sum, module) => sum + module.symbols.length, 0) };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const check = process.argv.includes('--check');
  const result = syncIndex(root, { check });
  console.log(`${result.files} файлов, ${result.symbols} символов`);
  if (check && result.changed.length) {
    console.error('Обновите индекс через npm run code:index. Расхождения: ' + result.changed.join(', '));
    process.exitCode = 1;
  }
}
