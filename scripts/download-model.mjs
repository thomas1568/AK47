import { chromium } from '@playwright/test';
import { mkdir } from 'node:fs/promises';

await mkdir('asset-sources', { recursive: true });
const browser = await chromium.launch({ channel: 'chrome', headless: true });
try {
  const page = await browser.newPage({ acceptDownloads: true });
  await page.goto('https://stein-indie.itch.io/classic-weapons-pack/purchase', { waitUntil: 'domcontentloaded' });
  await page.getByText('No thanks, just take me to the downloads').click();
  await page.waitForSelector('.upload');
  const uploads = await page.locator('.upload').allTextContents();
  console.log('Available public downloads:', uploads.map(value => value.trim()));
  const upload = page.locator('.upload').filter({ hasText: 'WeaponsPack.zip' });
  const pending = page.waitForEvent('download');
  await upload.getByRole('link', { name: 'Download', exact: true }).click();
  const download = await pending;
  await download.saveAs('asset-sources/WeaponsPack.zip');
  console.log('Saved CC0 model pack to asset-sources/WeaponsPack.zip');
} finally { await browser.close(); }
