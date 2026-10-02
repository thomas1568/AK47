import { chromium } from '@playwright/test';
import { createServer } from 'node:http';
import { readFile, writeFile, mkdir } from 'node:fs/promises';

// Decode the user-provided video in Chrome and export original stills locally.
const videoBytes = await readFile(new URL('../public/media/ak47-fall.mp4', import.meta.url));
const server = createServer((request, response) => {
  if (request.url === '/video.mp4') {
    const range = request.headers.range?.match(/bytes=(\d+)-(\d*)/);
    if (range) {
      const start = Number(range[1]);
      const end = range[2] ? Math.min(Number(range[2]), videoBytes.length - 1) : videoBytes.length - 1;
      response.writeHead(206, { 'Content-Type': 'video/mp4', 'Content-Length': end - start + 1, 'Content-Range': `bytes ${start}-${end}/${videoBytes.length}`, 'Accept-Ranges': 'bytes' });
      response.end(videoBytes.subarray(start, end + 1));
    } else {
      response.writeHead(200, { 'Content-Type': 'video/mp4', 'Content-Length': videoBytes.length, 'Accept-Ranges': 'bytes' });
      response.end(videoBytes);
    }
  } else {
    response.writeHead(200, { 'Content-Type': 'text/html' });
    response.end('<video muted playsinline preload="auto" src="/video.mp4"></video>');
  }
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
let browser;
try {
  browser = await chromium.launch({ channel: 'chrome', headless: true });
  const page = await browser.newPage();
  await page.goto(`http://127.0.0.1:${server.address().port}`);
  await page.waitForFunction(() => document.querySelector('video').readyState >= 2);
  const result = await page.evaluate(async () => {
    const video = document.querySelector('video');
    const fractions = [.02, .14, .26, .38, .5, .62, .74, .86, .97];
    const canvas = document.createElement('canvas');
    canvas.width = Math.min(1200, video.videoWidth);
    canvas.height = Math.round(canvas.width * video.videoHeight / video.videoWidth);
    const context = canvas.getContext('2d');
    const sheet = document.createElement('canvas');
    sheet.width = 900; sheet.height = 3 * (Math.round(300 * canvas.height / canvas.width) + 30);
    const ctx = sheet.getContext('2d');
    const frames = [];
    for (const [index, fraction] of fractions.entries()) {
      await new Promise(resolve => {
        video.addEventListener('seeked', resolve, { once: true });
        video.currentTime = fraction * video.duration;
      });
      await new Promise(resolve => setTimeout(resolve, 120));
      context.drawImage(video, 0, 0, canvas.width, canvas.height);
      frames.push(canvas.toDataURL('image/webp', .88).split(',')[1]);
      const height = Math.round(300 * canvas.height / canvas.width);
      const x = index % 3 * 300, y = Math.floor(index / 3) * (height + 30);
      ctx.drawImage(canvas, x, y, 300, height);
      ctx.fillStyle = '#ffffff'; ctx.font = '14px sans-serif';
      ctx.fillText(`${index + 1} / ${(fraction * video.duration).toFixed(2)}s`, x + 10, y + height + 20);
    }
    return { duration: video.duration, width: video.videoWidth, height: video.videoHeight, frames, sheet: sheet.toDataURL('image/jpeg', .85).split(',')[1] };
  });
  await mkdir(new URL('../public/images/', import.meta.url), { recursive: true });
  for (const [index, frame] of result.frames.entries()) {
    await writeFile(new URL(`../public/images/frame-${String(index + 1).padStart(2, '0')}.webp`, import.meta.url), Buffer.from(frame, 'base64'));
  }
  await writeFile(new URL('../video-contact-sheet.jpg', import.meta.url), Buffer.from(result.sheet, 'base64'));
  console.log(JSON.stringify({ duration: result.duration, width: result.width, height: result.height, extracted: result.frames.length }));
} finally {
  await browser?.close();
  server.close();
}
