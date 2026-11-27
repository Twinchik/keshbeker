import { expect, it } from 'vitest';
import { browserContext } from '../fixtures/browser-context.mjs';

// @covers js/shops.js#bestBankFor
it('различает кешбек для оплаты в магазине и доставки', () => {
  const app = browserContext('js/data.js', 'js/shops.js');
  app.setCards([
    { id: 'local', items: [{ n: 'Супермаркеты', p: 8 }] },
    { id: 'delivery', shops: [{ n: 'Дикси доставка', p: 14 }] },
    { id: 'base', items: [{ n: 'Всё остальное', p: 2 }] },
  ]);
  const bestBankFor = app.get('bestBankFor');
  expect(bestBankFor('Дикси')).toMatchObject({ card: { id: 'local' }, p: 8 });
  expect(bestBankFor('Дикси', true)).toMatchObject({ card: { id: 'delivery' }, p: 14 });
  expect(bestBankFor('Пятёрочка', true)).toBeNull();
});

it('возвращает null для пустого кошелька', () => {
  const app = browserContext('js/data.js', 'js/shops.js');
  expect(app.get('bestBankFor')('Дикси')).toBeNull();
});
