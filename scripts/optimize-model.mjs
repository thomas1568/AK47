import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { dedup, prune, weld, textureCompress } from '@gltf-transform/functions';
import sharp from 'sharp';
import { stat } from 'node:fs/promises';

const io = new NodeIO().registerExtensions(ALL_EXTENSIONS);
const document = await io.read('public/models/ak47.glb');
await document.transform(weld(), dedup(), prune(), textureCompress({ encoder: sharp, targetFormat: 'webp', resize: [2048, 2048], quality: 86 }));
await io.write('public/models/ak47.glb', document);
console.log('Optimized GLB:', (await stat('public/models/ak47.glb')).size, 'bytes');
