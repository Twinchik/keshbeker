import { beforeEach, expect, it } from 'vitest';
import { browserContext } from '../fixtures/browser-context.mjs';

let parseCashback;
beforeEach(() => { parseCashback = browserContext('js/data.js', 'js/scan.js').get('parseCashback'); });

// @covers js/scan.js#parseCashback
it('читает русские категории, дробную ставку и базовый кешбек', () => {
  expect(parseCashback('Сбер\nНоябрь\nАптеки 7,5%\n5% Такси\nВсё остальное 1%'))
    .toEqual({ bank: 'Сбер', month: 10, base: 1, items: [{ n: 'Аптеки', p: 7.5 }, { n: 'Такси', p: 5 }] });
});

it('собирает плитки с отдельной строкой для процента и выбирает больший дубль', () => {
  expect(parseCashback('Аптеки\n3%\n7% Аптеки\n\n5%\nТакси').items)
    .toEqual([{ n: 'Аптеки', p: 7 }, { n: 'Такси', p: 5 }]);
});

it('пропускает статус, кнопки и предложения без применимого процента', () => {
  expect(parseCashback('12:34 85%\nПодробнее\nАптеки 0%\nДо 30% у партнёров').items).toEqual([]);
});

it('возвращает пустой результат OCR', () => {
  expect(parseCashback('')).toEqual({ items: [], base: null, month: -1, bank: '' });
});
