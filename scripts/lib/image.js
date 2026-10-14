/**
 * Load an image into RGBA pixels without any npm dependency.
 *
 * PNG is decoded in JavaScript (see png.js). Everything else — JPEG, HEIC,
 * WebP, GIF — is transcoded to PNG first using a tool that is already on the
 * machine: `sips` on macOS, ImageMagick or ffmpeg elsewhere. If none of them
 * exist we say so instead of failing with a stack trace.
 */
import { readFileSync, writeFileSync, existsSync, mkdtempSync, rmSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { decodePng } from './png.js';

const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

const TRANSCODERS = [
  { name: 'sips', args: (inp, out) => ['-s', 'format', 'png', inp, '--out', out] },
  { name: 'magick', args: (inp, out) => [inp, out] },
  { name: 'convert', args: (inp, out) => [inp, out] },
  { name: 'ffmpeg', args: (inp, out) => ['-y', '-loglevel', 'error', '-i', inp, out] },
];

function hasBinary(name) {
  try {
    execFileSync(process.platform === 'win32' ? 'where' : 'which', [name], { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

function detectExtension(buffer) {
  if (buffer[0] === 0xff && buffer[1] === 0xd8) return '.jpg';
  if (buffer.toString('ascii', 0, 4) === 'RIFF') return '.webp';
  if (buffer.toString('ascii', 0, 3) === 'GIF') return '.gif';
  if (buffer.toString('ascii', 4, 8) === 'ftyp') return '.heic';
  return null;
}

/** Transcode any image to PNG using whatever is available on this machine. */
export function toPng(source, outDir) {
  const out = path.join(outDir, 'converted.png');

  for (const tool of TRANSCODERS.filter((t) => hasBinary(t.name))) {
    try {
      execFileSync(tool.name, tool.args(source, out), { stdio: 'ignore' });
      if (existsSync(out)) return { file: out, via: tool.name };
    } catch {
      // Try the next tool.
    }
  }

  throw new Error(
    'Cannot read this image format. Install one of: ' +
      TRANSCODERS.map((t) => t.name).join(', ') +
      ' — or convert the photo to PNG first.',
  );
}

/**
 * Decode an image file or buffer into `{ width, height, data }` (RGBA).
 * Non-PNG input is transcoded through a system tool.
 */
export function loadImage(input) {
  const buffer = Buffer.isBuffer(input) ? input : readFileSync(input);

  if (buffer.subarray(0, 8).equals(PNG_SIGNATURE)) return decodePng(buffer);

  // Not a PNG, so it has to exist on disk for a transcoder to pick it up.
  const dir = mkdtempSync(path.join(tmpdir(), 'card-'));
  try {
    const source = path.join(dir, 'input' + (detectExtension(buffer) ?? ''));
    writeFileSync(source, buffer);
    return decodePng(readFileSync(toPng(source, dir).file));
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

/** Download a URL into a buffer, following redirects. */
export async function fetchBuffer(url) {
  const response = await fetch(url, {
    redirect: 'follow',
    headers: { 'user-agent': 'terminal-card' },
  });
  if (!response.ok) {
    throw new Error(`${response.status} ${response.statusText} for ${url}`);
  }
  return Buffer.from(await response.arrayBuffer());
}