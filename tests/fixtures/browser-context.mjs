import { readFileSync } from 'node:fs';
import { createContext, runInContext } from 'node:vm';
import { fileURLToPath } from 'node:url';

const app = new URL('../../', import.meta.url);
const frozen = new Date(2026, 10, 15, 12).getTime();

class FrozenDate extends Date {
  constructor(...args) {
    super(...(args.length ? args : [frozen]));
  }

  static now() {
    return frozen;
  }
}

export function browserContext(...files) {
  const element = { addEventListener() {}, setAttribute() {}, appendChild() {} };
  const elements = new Map();
  const context = createContext({
    Date: FrozenDate,
    document: {
      querySelector(selector) {
        if (!elements.has(selector)) elements.set(selector, { ...element });
        return elements.get(selector);
      },
      createElement: () => ({ ...element }),
      body: element,
    },
    matchMedia: () => ({ matches: false }),
  });
  for (const file of files) {
    const filename = fileURLToPath(new URL(file, app));
    runInContext(readFileSync(filename, 'utf8'), context, { filename });
  }
  return {
    get: name => runInContext(name, context),
    setCards(values) {
      context.testCards = structuredClone(values);
      runInContext('cards = testCards', context);
    },
    setQuery(value) {
      context.testQuery = value;
      runInContext('query = testQuery', context);
    },
  };
}
