import ffmpeg from 'ffmpeg-static';
import { spawnSync } from 'node:child_process';
import { mkdir, readdir, stat, writeFile } from 'node:fs/promises';

// Frame-addressable WebP sequence eliminates repeated MP4 seeking during scroll.
await mkdir('public/sequence', { recursive: true });
const result = spawnSync(ffmpeg, ['-hide_banner', '-loglevel', 'error', '-y', '-i', 'public/media/ak47-fall.mp4', '-vf', 'fps=24,scale=1280:-2', '-c:v', 'libwebp', '-quality', '78', '-compression_level', '4', '-start_number', '0', 'public/sequence/ak-%03d.webp'], { stdio: 'inherit' });
if (result.status !== 0) process.exit(result.status || 1);
const files = (await readdir('public/sequence')).filter(name => /^ak-\d+\.webp$/.test(name)).sort();
let bytes = 0;
for (const file of files) bytes += (await stat(`public/sequence/${file}`)).size;
await writeFile('public/sequence/manifest.json', JSON.stringify({ frames: files.length, fps: 24, width: 1280, height: 720, duration: 8, bytes }));
console.log(JSON.stringify({ frames: files.length, megabytes: +(bytes / 1e6).toFixed(2) }));
