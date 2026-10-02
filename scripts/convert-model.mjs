import { chromium } from '@playwright/test';
import { createServer } from 'vite';
import { writeFile } from 'node:fs/promises';

const server = await createServer({ configFile: false, server: { host: '127.0.0.1', port: 4182, strictPort: true } });
await server.listen();
const browser = await chromium.launch({ channel: 'chrome', headless: true });
try {
  const page = await browser.newPage();
  page.on('pageerror', error => console.error(error.message));
  await page.goto('http://127.0.0.1:4182/scripts/model-workbench.html');
  await page.waitForFunction(() => window.convertModel, { timeout: 30000 });
  const result = await page.evaluate(() => window.convertModel());
  await writeFile('public/models/ak47.glb', Buffer.from(result.base64, 'base64'));
  console.log(JSON.stringify({ ...result, base64: undefined }));
} finally { await browser.close(); await server.close(); }
