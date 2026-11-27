import { expect, test } from '@playwright/test';

test.beforeEach(async ({ context, page, baseURL }) => {
  const origin = new URL(baseURL).origin;
  await context.route('**/*', route => {
    const url = new URL(route.request().url());
    if (url.origin === origin && url.pathname === '/js/config.js') {
      return route.fulfill({
        contentType: 'application/javascript',
        body: 'window.KESHBEKER_CONFIG = { url: "https://test.invalid", key: "synthetic-public-key" };',
      });
    }
    if (url.origin === origin) return route.continue();
    if (url.hostname === 'cdn.jsdelivr.net' && url.pathname.includes('/@supabase/supabase-js@')) {
      return route.fulfill({
        contentType: 'application/javascript',
        body: 'window.supabase = { createClient: () => ({ auth: { getSession: async () => ({ data: { session: null } }), onAuthStateChange: () => {} } }) };',
      });
    }
    return route.abort();
  });
  await page.clock.setFixedTime(new Date(2026, 10, 15, 12));
});

test('открывает приветствие на локальной PWA', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveTitle(/Кешбекер/);
  await expect(page.getByRole('dialog', { name: 'Добро пожаловать' })).toBeVisible();
});

test('гость добавляет карты, ищет лучший кешбек и сохраняет его после перезагрузки', async ({ page }) => {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.addInitScript(() => {
    for (const key of ['welcomed', 'guided', 'toured', 'guide-auto']) localStorage.setItem('cashbacker-' + key, '1');
  });
  await page.goto('/');
  await page.getByRole('button', { name: 'Продолжить без входа' }).click();
  await expect(page.locator('#gate')).toBeHidden();

  for (const [bank, percent] of [['Учебный банк А', '4'], ['Учебный банк Б', '9']]) {
    await page.locator('#addBtn').click();
    await page.locator('#edBank').fill(bank);
    await page.locator('#edN0').fill('Аптеки');
    await page.locator('#edP0').fill(percent);
    await page.getByRole('button', { name: 'Сохранить', exact: true }).click();
    await expect(page.locator('#edForm')).toBeHidden();
  }

  const search = page.getByRole('combobox', { name: 'Категория или магазин' });
  const answer = page.locator('#answerBox .answer');
  for (let attempt = 0; attempt < 2; attempt++) {
    if (attempt) await page.reload();
    await search.fill('Аптеки');
    await expect(answer.locator('strong')).toHaveText('Учебный банк Б');
    await expect(answer.locator('.pct')).toHaveText('9%');
  }
  expect(errors).toEqual([]);
});
