import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { resolve, extname, sep } from 'node:path';

// Test the exact dist/ files under a subdirectory, as VS Code Live Server does.
const root = process.cwd();
const types = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.mp4': 'video/mp4', '.webp': 'image/webp', '.jpg': 'image/jpeg', '.wasm': 'application/wasm' };
createServer(async (request, response) => {
  const pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
  if (pathname === '/favicon.ico') { response.writeHead(204); response.end(); return; }
  const relative = pathname === '/' ? 'index.html' : pathname.slice(1);
  const file = resolve(root, relative);
  if (!file.startsWith(root + sep) || !/^(index\.html$|(?:dist|src|public)\/)/.test(relative)) {
    response.writeHead(404); response.end(); return;
  }
  try {
    const bytes = await readFile(file);
    const headers = { 'Content-Type': types[extname(file)] || 'application/octet-stream', 'Accept-Ranges': 'bytes', 'Cache-Control': 'no-store' };
    const range = request.headers.range?.match(/bytes=(\d+)-(\d*)/);
    if (range) {
      const start = Number(range[1]), end = range[2] ? Math.min(Number(range[2]), bytes.length - 1) : bytes.length - 1;
      if (start > end) { response.writeHead(416); response.end(); return; }
      response.writeHead(206, { ...headers, 'Content-Length': end - start + 1, 'Content-Range': `bytes ${start}-${end}/${bytes.length}` });
      response.end(bytes.subarray(start, end + 1));
    } else {
      response.writeHead(200, { ...headers, 'Content-Length': bytes.length });
      response.end(bytes);
    }
  } catch { response.writeHead(404); response.end(); }
}).listen(4178, '127.0.0.1');
