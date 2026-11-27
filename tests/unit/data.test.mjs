import { beforeEach, describe, expect, it } from 'vitest';
import { browserContext } from '../fixtures/browser-context.mjs';

let app;
beforeEach(() => { app = browserContext('js/data.js'); });

describe('формат карты', () => {
  // @covers js/data.js#normCard
  it('переносит старые предложения в магазины и оставляет большую ставку', () => {
    const card = {
      id: 'demo',
      shops: [{ n: 'Магнит', p: 3 }],
      items: [{ n: 'Магнит', p: 6, k: 'shop' }, { n: 'Такси', p: 5 }],
      next: { month: '2026-12', items: [{ n: 'МАГНИТ', p: 4, k: 'shop' }, { n: 'Кино', p: 7 }] },
    };
    expect(app.get('normCard')(card)).toEqual({
      id: 'demo', shops: [{ n: 'Магнит', p: 6 }], items: [{ n: 'Такси', p: 5 }],
      next: { month: '2026-12', items: [{ n: 'Кино', p: 7 }] },
    });
    expect(card.items).toHaveLength(2);
    expect(app.get('normCard')({ id: 'empty' })).toMatchObject({ items: [], shops: [] });
  });

  // @covers js/data.js#cleanP
  // @covers js/data.js#cleanItems
  it('нормализует дробные и некорректные проценты', () => {
    expect(app.get('cleanItems')([
      { n: ' ', p: 5 }, { n: ' Такси ', p: '7,5' }, { n: 'Кино', p: 'ошибка' },
      { n: 'АЗС', p: -2 }, { n: 'Аптеки', p: 130 },
    ])).toEqual([{ n: 'Такси', p: 7.5 }, { n: 'Кино', p: 0 }, { n: 'АЗС', p: 0 }, { n: 'Аптеки', p: 100 }]);
  });

  // @covers js/data.js#rollCard
  it('переносит категории в нужном месяце и сохраняет будущий набор до срока', () => {
    const rollCard = app.get('rollCard');
    const card = { month: '2026-10', items: [{ n: 'Кино', p: 3 }] };
    const items = [{ n: 'Такси', p: 8 }];
    expect(rollCard({ ...card, next: { month: '2026-12', items } })).toBeNull();
    expect(rollCard({ ...card, next: { month: '2026-11', items } }))
      .toEqual({ month: '2026-11', items, next: null, updatedAt: new Date(2026, 10, 15, 12).getTime() });
  });

  // @covers js/data.js#addMonth
  it('переносит декабрь на январь нового года', () => {
    expect(app.get('addMonth')('2026-12')).toBe('2027-01');
  });
});

describe('поиск и ранжирование', () => {
  // @covers js/data.js#merchantFor
  it('сопоставляет известный и диапазонный MCC и отклоняет неизвестный', () => {
    const merchantFor = app.get('merchantFor');
    expect(merchantFor('5814')).toMatchObject({ key: 'fastfood', byCode: true });
    expect(merchantFor('3100')).toMatchObject({ key: 'air', byCode: true });
    expect(merchantFor('9999')).toBeNull();
  });

  // @covers js/data.js#expand
  // @covers js/data.js#matches
  // @covers js/data.js#rankCard
  it('ищет по категории и предпочитает специальную ставку базовой', () => {
    const rankCard = app.get('rankCard');
    const terms = app.get('expand')(' ТАКСИ ');
    expect(rankCard({ items: [{ n: 'Всё остальное', p: 9 }, { n: 'Такси', p: 5 }] }, terms))
      .toMatchObject({ p: 5, base: false, item: { n: 'Такси' } });
    expect(rankCard({ items: [{ n: 'Кино', p: 5 }] }, terms)).toEqual({ p: 0, item: null, base: true });
    expect(rankCard({ items: [{ n: 'Всё остальное', p: 1 }] }, terms)).toMatchObject({ p: 1, base: true });
  });

  // @covers js/data.js#ranking
  it('сравнивает проценты и сохраняет порядок при равных ставках', () => {
    const card = (id, p) => ({ id, items: [{ n: 'Фастфуд', p }] });
    app.setCards([card('first', 7), card('lower', 3), card('same', 7)]);
    app.setQuery('5814');
    expect(app.get('ranking')().list.map(row => [row.card.id, row.p]))
      .toEqual([['first', 7], ['same', 7], ['lower', 3]]);
  });

  it('поддерживает пустой запрос и пустой кошелёк', () => {
    const ranking = app.get('ranking');
    expect(ranking()).toBeNull();
    app.setQuery('Такси');
    expect(ranking().list).toEqual([]);
  });
});
