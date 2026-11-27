import { expect, it } from 'vitest';
import { browserContext } from '../fixtures/browser-context.mjs';

// @covers js/scan.js#parseCashback
// @covers js/data.js#ranking
// @covers js/shops.js#bestBankFor
it('использует распознанные категории для поиска по MCC и магазину', () => {
  const app = browserContext('js/data.js', 'js/scan.js', 'js/shops.js');
  const { items } = app.get('parseCashback')('Фастфуд 8%\nАптеки 3%');
  app.setCards([{ id: 'ocr', items }, { id: 'manual', items: [{ n: 'Фастфуд', p: 5 }] }]);
  app.setQuery('5814');
  expect(app.get('ranking')().list[0]).toMatchObject({ card: { id: 'ocr' }, p: 8 });
  expect(app.get('bestBankFor')('Ростикс')).toMatchObject({ card: { id: 'ocr' }, p: 8 });
});
