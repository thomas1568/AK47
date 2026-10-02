import { test, expect } from '@playwright/test';

const frame = page => page.locator('.story-media').evaluate(element => Number(element.dataset.frame || 0));
async function goYear(page, id) {
  await page.locator(`.timeline-nav a[href="#year-${id}"]`).click();
  await expect.poll(() => page.locator(`#year-${id}`).evaluate(element => Math.abs(element.getBoundingClientRect().top + element.offsetHeight / 2 - innerHeight / 2))).toBeLessThan(3);
}
async function loadStory(page) {
  await page.goto('/dist/index.html');
  await expect(page.locator('#motion-toggle')).toHaveText('Figer Ⅱ');
  await goYear(page, '1947');
  await expect(page.locator('.story-media')).toHaveAttribute('data-backend', 'sequence');
}

test('real textured model loads, can rotate and zoom, and does not block the wheel', async ({ page }) => {
  const errors = []; page.on('pageerror', error => errors.push(error.message));
  await page.goto('/dist/index.html');
  await expect(page.locator('#viewer')).toHaveAttribute('data-model-state', 'ready', { timeout: 15000 });
  expect(await page.locator('#viewer').evaluate(el => Number(el.dataset.triangles))).toBeGreaterThan(10000);
  await page.locator('#rotate-left').click(); await page.locator('#zoom-in').click(); await page.locator('#reset').click();
  await page.mouse.move(700, 500); await page.mouse.down(); await page.mouse.move(850, 530, { steps: 12 }); await page.mouse.up();
  await page.locator('#reset').click();
  await expect(page.locator('#viewer canvas')).toHaveCSS('opacity', '1');
  await page.screenshot({ path: 'test-results/hero-realistic.png' });
  await page.mouse.wheel(0, 700); await expect.poll(() => page.evaluate(() => scrollY)).toBeGreaterThan(400);
  expect(errors).toEqual([]);
});

test('full-screen sequence scrubs both ways with bounded decoded memory', async ({ page }) => {
  const errors = []; page.on('pageerror', error => errors.push(error.message));
  await loadStory(page);
  const box = await page.locator('.story-media').boundingBox();
  expect(box.x).toBe(0); expect(box.y).toBeCloseTo(0); expect(box.width).toBe(1440); expect(box.height).toBe(900);
  const before = await frame(page);
  await page.mouse.move(900, 450); await page.mouse.wheel(0, 1400);
  await expect.poll(() => frame(page)).toBeGreaterThan(before + 30);
  const later = await frame(page);
  await page.mouse.wheel(0, -850); await expect.poll(() => frame(page)).toBeLessThan(later - 15);
  expect(await page.locator('.story-media').evaluate(el => Number(el.dataset.decodedFrames))).toBeLessThanOrEqual(18);
  await expect(page.locator('.timeline-nav [aria-current="step"]')).toHaveCount(1);
  expect(errors).toEqual([]);
});

test('years, freeze/resume, and image enlargement work', async ({ page }) => {
  await loadStory(page);
  for (const [id, year] of [['1949','1949'],['1959','1959'],['1974','1974'],['today','Aujourd’hui']]) {
    await goYear(page, id); await expect(page.locator('.film-year')).toHaveText(year);
  }
  await expect.poll(() => frame(page)).toBeGreaterThan(170);
  await page.locator('#motion-toggle').click();
  const frozenFrame = await frame(page);
  await goYear(page, '1949'); await expect(page.locator('.film-year')).toHaveText('1949');
  expect(await frame(page)).toBe(frozenFrame);
  await page.locator('#motion-toggle').click(); await expect.poll(() => frame(page)).toBeLessThan(65);
  await goYear(page, '1959'); await expect.poll(() => frame(page)).toBeGreaterThan(85);
  await page.screenshot({ path: 'test-results/story-desktop.png' });
  await page.locator('.archive-gallery .image-zoom').nth(1).click();
  await expect(page.locator('#image-dialog')).toBeVisible();
  await expect.poll(() => page.locator('#expanded-image').evaluate(img => img.complete && img.naturalWidth > 0)).toBeTruthy();
  await page.keyboard.press('Escape'); await expect(page.locator('#image-dialog')).not.toBeVisible();
});

test('mobile uses the entire viewport and keeps the dates accessible', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await loadStory(page); await goYear(page, '1974');
  await expect(page.locator('.film-year')).toHaveText('1974');
  await expect.poll(() => frame(page)).toBeGreaterThan(115);
  const box = await page.locator('.story-media').boundingBox();
  expect(box.y).toBeCloseTo(0); expect(box.height).toBe(844); expect(box.width).toBe(390);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBeTruthy();
  expect(await page.locator('.story-media').evaluate(el => Number(el.dataset.decodedFrames))).toBeLessThanOrEqual(10);
  await page.screenshot({ path: 'test-results/story-mobile.png' });
});

test('reduced motion preserves a still film and readable content', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/dist/index.html'); await expect(page.locator('#motion-toggle')).toHaveAttribute('aria-pressed','true');
  await goYear(page, '1974'); await expect(page.locator('.film-year')).toHaveText('1974');
  expect(await frame(page)).toBe(0);
  await expect(page.locator('#year-1974 .chapter-body')).toHaveCSS('opacity','1');
});

test('MP4 fallback works when the sequence cannot be loaded', async ({ page }) => {
  await page.route('**/sequence/**', route => route.abort());
  await page.goto('/dist/index.html'); await goYear(page, '1959');
  await expect(page.locator('.story-media')).toHaveAttribute('data-backend','video');
  await expect.poll(() => page.locator('#history-video').evaluate(video => video.currentTime)).toBeGreaterThan(3);
});

test('source opening still reaches the complete Live Server build', async ({ page }) => {
  await page.goto('/index.html'); await expect(page).toHaveURL(/\/dist\/index.html$/);
  await expect(page.locator('#motion-toggle')).toHaveText('Figer Ⅱ');
});
