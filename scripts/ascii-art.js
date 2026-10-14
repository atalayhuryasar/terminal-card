#!/usr/bin/env node
/**
 * Turn a photo — or somebody's GitHub avatar — into ASCII art for the card.
 *
 *   node scripts/ascii-art.js photo.jpg
 *   node scripts/ascii-art.js --github atalayhuryasar
 *   node scripts/ascii-art.js --github atalayhuryasar --update-config
 *
 * PNG is decoded here in JavaScript; other formats are handed to a tool that
 * is already installed (`sips`, ImageMagick, ffmpeg). No npm dependencies.
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';

import { loadImage, fetchBuffer } from './lib/image.js';
import { asciiArt, replaceAsciiBlock, CHARSETS } from './lib/ascii.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(here, '..');

/* ------------------------------------------------------------------ args */

const argv = process.argv.slice(2);
const flag = (...names) =>
  names.some((n) => argv.includes(`--${n}`) || argv.includes(`-${n}`));
const option = (name, fallback) => {
  const i = argv.findIndex((a) => a === `--${name}`);
  return i === -1 ? fallback : argv[i + 1];
};
const positional = argv.filter((a, i) => !a.startsWith('-') && !argv[i - 1]?.startsWith('--'));

const HELP = `
  ${'ascii-art'} — turn a photo into ASCII art for the card

  ${'Usage'}
    node scripts/ascii-art.js <photo>          ${'[options]'}
    node scripts/ascii-art.js --github <user>  ${'[options]'}

  ${'Options'}
    --github <user>     Use that GitHub user's avatar
    --width, -w <n>     Width in characters (default 40)
    --mode <mode>       shade | mono | blocks   (default shade)
    --charset <name>    ${Object.keys(CHARSETS).join(' | ')}
    --invert            For light terminal backgrounds
    --no-levels         Skip the automatic contrast stretch
    --zoom <n>          Crop in by a factor (portraits read better zoomed)
    --focus <where>     top | center | bottom (default center)
    --rows <n>          Crop so the art is exactly n lines tall
    --no-color          Disable ANSI colour (blocks mode)
    --update-config     Write the result into me.config.js
    --out <file>        Write to a file instead of stdout
    --help, -h          Show this help

  ${'Examples'}
    node scripts/ascii-art.js me.jpg -w 32
    node scripts/ascii-art.js --github atalayhuryasar --update-config
    node scripts/ascii-art.js photo.png --mode blocks --width 50
`;

if (flag('help', 'h')) {
  process.stdout.write(HELP);
  process.exit(0);
}

/* ----------------------------------------------------------------- input */

const user = option('github');
let source;

if (user) {
  const url = `https://github.com/${user}.png?size=460`;
  process.stderr.write(`fetching ${url}\n`);
  try {
    source = await fetchBuffer(url);
  } catch (error) {
    process.stderr.write(`could not fetch the avatar for "${user}": ${error.message}\n`);
    process.exit(1);
  }
} else if (positional.length) {
  const file = path.resolve(positional[0]);
  if (!existsSync(file)) {
    process.stderr.write(`no such file: ${file}\n`);
    process.exit(1);
  }
  source = readFileSync(file);
} else {
  process.stdout.write(HELP);
  process.exit(1);
}

/* ---------------------------------------------------------------- render */

const mode = option('mode', 'shade');
if (!['shade', 'mono', 'blocks'].includes(mode)) {
  process.stderr.write(`unknown mode "${mode}" — use shade, mono or blocks\n`);
  process.exit(1);
}

const width = Number(option('width', option('w', 40)));
// `shade` is mono mode with the block-character ramp; an explicit
// --charset always wins over it.
const charset = option('charset', mode === 'shade' ? 'shade' : 'classic');
if (!CHARSETS[charset]) {
  process.stderr.write(
    `unknown charset "${charset}" — use one of: ${Object.keys(CHARSETS).join(', ')}\n`,
  );
  process.exit(1);
}

let image;
try {
  image = loadImage(source);
} catch (error) {
  process.stderr.write(`${error.message}\n`);
  process.exit(1);
}

const art = asciiArt(image, {
  columns: width,
  mode: mode === 'shade' ? 'mono' : mode,
  charset,
  invert: flag('invert'),
  color: !flag('no-color'),
  levels: !flag('no-levels'),
  zoom: Number(option('zoom', 1)),
  rows: Number(option('rows', 0)) || undefined,
  focus: option('focus', 'center'),
});

const text = art.lines.join('\n');

/* ---------------------------------------------------------------- output */

const outFile = option('out');
if (outFile) {
  writeFileSync(path.resolve(outFile), text + '\n');
  process.stderr.write(`wrote ${path.relative(process.cwd(), path.resolve(outFile))}\n`);
} else {
  process.stdout.write(text + '\n');
}

process.stderr.write(
  `\n${art.columns}x${art.rows} characters from a ${image.width}x${image.height} image\n`,
);

if (flag('update-config')) {
  const config = path.join(root, 'me.config.js');
  const sourceText = readFileSync(config, 'utf8');
  try {
    writeFileSync(config, replaceAsciiBlock(sourceText, art.lines));
    process.stderr.write(`updated ${path.relative(root, config)}\n`);
  } catch (error) {
    process.stderr.write(`could not update the config: ${error.message}\n`);
    process.exit(1);
  }
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  // nothing to clean up
}