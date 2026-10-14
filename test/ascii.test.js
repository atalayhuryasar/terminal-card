import test from 'node:test';
import assert from 'node:assert/strict';

import { encodePng, decodePng } from '../scripts/lib/png.js';
import { loadImage } from '../scripts/lib/image.js';
import {
  asciiArt,
  crop,
  fitRows,
  luminance,
  normalize,
  renderBlocks,
  renderMono,
  resize,
  replaceAsciiBlock,
  CHARSETS,
  rowsFor,
} from '../scripts/lib/ascii.js';

/** A tiny solid-colour image, built with our own encoder. */
const solid = (width, height, [r, g, b, a = 255]) => ({
  width,
  height,
  data: Buffer.from(
    Array.from({ length: width * height }, () => [r, g, b, a]).flat(),
  ),
});

/** A left-to-right black-to-white gradient. */
function gradient(width, height) {
  const data = Buffer.alloc(width * height * 4);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const v = Math.round((x / Math.max(1, width - 1)) * 255);
      const i = (y * width + x) * 4;
      data[i] = data[i + 1] = data[i + 2] = v;
      data[i + 3] = 255;
    }
  }
  return { width, height, data };
}

/* ------------------------------------------------------------------ png */

test('PNG survives an encode/decode round trip', () => {
  const image = gradient(16, 9);
  const decoded = decodePng(encodePng(image));
  assert.equal(decoded.width, 16);
  assert.equal(decoded.height, 9);
  assert.ok(decoded.data.equals(image.data));
});

test('PNG handles a single pixel and alpha', () => {
  const image = solid(1, 1, [10, 20, 30, 128]);
  const decoded = decodePng(encodePng(image));
  assert.deepEqual([...decoded.data], [10, 20, 30, 128]);
});

test('PNG rejects data that is not a PNG', () => {
  assert.throws(() => decodePng(Buffer.from('not a png at all')), /Not a PNG/);
});

test('loadImage reads a PNG buffer', () => {
  const image = loadImage(encodePng(gradient(4, 4)));
  assert.equal(image.width, 4);
  assert.equal(image.data.length, 4 * 4 * 4);
});

/* --------------------------------------------------------------- resize */

test('resize produces the requested dimensions', () => {
  const out = resize(gradient(40, 20), 8, 4);
  assert.equal(out.width, 8);
  assert.equal(out.height, 4);
  assert.equal(out.data.length, 8 * 4 * 4);
});

test('resize averages rather than samples, so gradients stay smooth', () => {
  const out = resize(gradient(200, 100), 20, 10);
  // The far-left column is black-ish, the far-right column is white-ish.
  const left = luminance(out)[0];
  const right = luminance(out)[19];
  assert.ok(left < 40, `left column too bright: ${left}`);
  assert.ok(right > 215, `right column too dark: ${right}`);
});

test('resize of a solid image keeps the colour', () => {
  const out = resize(solid(8, 8, [200, 100, 50, 255]), 4, 4);
  assert.deepEqual([...out.data.slice(0, 4)], [200, 100, 50, 255]);
});

/* ----------------------------------------------------------------- crop */

test('crop is a no-op without zoom', () => {
  const image = gradient(10, 10);
  assert.equal(crop(image, { zoom: 1 }), image);
  assert.equal(crop(image, { zoom: 0.5 }), image);
});

test('crop zooms towards the requested focus', () => {
  const image = gradient(100, 100);
  for (const focus of ['top', 'center', 'bottom']) {
    const out = crop(image, { zoom: 2, focus });
    assert.equal(out.width, 50);
    assert.equal(out.height, 50);
    assert.equal(out.data.length, 50 * 50 * 4);
  }
});

test('crop top keeps the first rows, bottom keeps the last', () => {
  // Uniform rows, so the horizontal centring does not matter.
  const image = solid(4, 4, [0, 0, 0, 255]);
  image.data.fill(0, 0, 4 * 4); // top half black
  image.data.fill(255, 4 * 4 * 2); // bottom half white

  assert.equal(crop(image, { zoom: 2, focus: 'top' }).data[0], 0);
  assert.equal(crop(image, { zoom: 2, focus: 'bottom' }).data[0], 255);
});

/* -------------------------------------------------------------- fitRows */

test('fitRows crops to the aspect that yields the requested height', () => {
  const out = fitRows(gradient(100, 100), 10, 40);
  assert.equal(out.width, 100, 'the crop keeps the full width');
  assert.ok(out.height < 100, 'the crop shortens the image');
  assert.equal(rowsFor(40, out), 10, 'and renders as exactly 10 rows');
});

test('fitRows narrows a wide image instead of squashing it', () => {
  const out = fitRows(gradient(400, 80), 20, 40);
  assert.equal(out.height, 80);
  assert.ok(out.width < 400, 'a too-wide image is narrowed, not squashed');
  assert.equal(rowsFor(40, out), 20);
});

test('fitRows without a row count returns the image untouched', () => {
  const image = gradient(10, 10);
  assert.equal(fitRows(image, undefined, 40), image);
});

/* ------------------------------------------------------------ rendering */

test('renderMono returns one character per cell', () => {
  const art = renderMono(gradient(100, 100), { columns: 20 });
  assert.equal(art.length, 40); // square image at ratio 0.5
  for (const line of art) assert.equal(line.length, 20);
});

test('renderMono only uses characters from the chosen ramp', () => {
  const ramp = CHARSETS.classic;
  for (const line of renderMono(gradient(60, 60), { columns: 30 })) {
    for (const char of line) {
      assert.ok(ramp.includes(char), `unexpected character ${JSON.stringify(char)}`);
    }
  }
});

test('renderMono maps bright pixels to brighter characters', () => {
  // Left half white, right half black.
  const image = solid(8, 8, [0, 0, 0, 255]);
  for (let y = 0; y < 8; y++) {
    for (let x = 0; x < 4; x++) {
      const i = (y * 8 + x) * 4;
      image.data[i] = image.data[i + 1] = image.data[i + 2] = 255;
    }
  }

  const line = renderMono(image, { columns: 8 })[0];
  const ramp = CHARSETS.classic;
  // Ramps run dark -> bright, so a higher index is a brighter pixel.
  assert.ok(
    ramp.indexOf(line[0]) > ramp.indexOf(line[7]),
    `bright pixel should be brighter: ${JSON.stringify(line)}`,
  );
  assert.equal(line.slice(0, 4), line.slice(0, 4));
  assert.equal(ramp.indexOf(line[0]), ramp.length - 1, 'white maps to the top of the ramp');
});

test('renderMono inverts on request', () => {
  const image = solid(8, 8, [255, 255, 255, 255]);
  const normal = renderMono(image, { columns: 8 })[0];
  const flipped = renderMono(image, { columns: 8, invert: true })[0];
  const ramp = CHARSETS.classic;

  // A white image is the top of the ramp normally, and the bottom inverted.
  assert.equal(normal, ramp.at(-1).repeat(8));
  assert.equal(flipped, '', 'inverted white becomes a blank line, then trimmed');
});

test('renderMono inverts a mid-tone the other way round', () => {
  const image = solid(8, 8, [128, 128, 128, 255]);
  const ramp = CHARSETS.classic;
  const normal = renderMono(image, { columns: 8, levels: false })[0];
  const flipped = renderMono(image, { columns: 8, levels: false, invert: true })[0];
  assert.equal(normal[0], ramp[Math.floor((128 / 255) * ramp.length)]);
  assert.equal(flipped[0], ramp[ramp.length - 1 - Math.floor((128 / 255) * ramp.length)]);
});

test('renderMono honours the aspect ratio option', () => {
  assert.equal(renderMono(gradient(100, 100), { columns: 10 }).length, 20);
  assert.equal(renderMono(gradient(100, 100), { columns: 10, cellRatio: 1 }).length, 10);
});

test('renderBlocks doubles the vertical resolution', () => {
  const mono = renderMono(gradient(100, 100), { columns: 20 });
  const blocks = renderBlocks(gradient(100, 100), { columns: 20, color: false });
  assert.equal(blocks.length, mono.length * 2);
  for (const line of blocks) assert.equal([...line].length, 20);
});

test('renderBlocks emits 24-bit colour, or nothing when colour is off', () => {
  const coloured = renderBlocks(gradient(40, 40), { columns: 8, color: true });
  assert.match(coloured[0], /\u001b\[38;2;\d+;\d+;\d+m/);
  assert.ok(!renderBlocks(gradient(40, 40), { columns: 8, color: false })[0].includes('\u001b'));
});

test('renderBlocks terminates every line so colour cannot bleed', () => {
  for (const line of renderBlocks(gradient(40, 40), { columns: 8, color: true })) {
    assert.ok(line.endsWith('\u001b[0m'), 'line must reset its colour');
  }
});

/* ---------------------------------------------------------------- entry */

test('asciiArt reports the shape it produced', () => {
  for (const mode of ['mono', 'blocks']) {
    const art = asciiArt(gradient(120, 120), { columns: 30, mode });
    assert.equal(art.mode, mode);
    assert.equal(art.columns, 30);
    assert.ok(art.rows > 0);
    assert.equal(art.lines.length, art.rows);
  }
});

test('asciiArt respects an explicit row count', () => {
  const art = asciiArt(gradient(200, 200), { columns: 40, rows: 18 });
  assert.equal(art.rows, 18);
  for (const line of art.lines) assert.equal([...line].length, 40);
});

test('asciiArt survives an unknown charset without crashing', () => {
  const art = asciiArt(gradient(40, 40), { columns: 10, charset: 'nope' });
  assert.equal(art.lines.length > 0, true);
});

/* ------------------------------------------------------------ normalize */

test('normalize stretches a flat image to the full tonal range', () => {
  // Everything sits between 100 and 110 — no ramp can show that.
  const flat = solid(16, 16, [100, 100, 100, 255]);
  flat.data.fill(110, 0, 16 * 4);

  const out = normalize(flat);
  const tones = [...out.data].filter((_, i) => i % 4 !== 3);
  assert.ok(Math.min(...tones) <= 1, `dark end not stretched: ${Math.min(...tones)}`);
  assert.ok(Math.max(...tones) >= 254, `bright end not stretched: ${Math.max(...tones)}`);
});

test('normalize leaves a uniform image alone', () => {
  const flat = solid(8, 8, [128, 128, 128, 255]);
  assert.equal(normalize(flat), flat, 'no spread means no stretch, just noise');
});

test('normalize does not touch the alpha channel', () => {
  const image = solid(8, 8, [100, 100, 100, 77]);
  for (let i = 0; i < image.data.length; i += 4) {
    image.data[i] = image.data[i + 1] = image.data[i + 2] = 140;
  }
  const out = normalize(image);
  for (let i = 3; i < out.data.length; i += 4) assert.equal(out.data[i], 77);
});

test('normalize with no clipping is the identity', () => {
  const image = gradient(12, 12);
  assert.equal(normalize(image, 0), image);
});

test('normalize widens the contrast of a flat photo', () => {
  const image = gradient(40, 40);
  for (let i = 0; i < image.data.length; i += 4) {
    image.data[i] = 120 + image.data[i] * 0.12;
  }
  const out = normalize(image);
  assert.ok(Math.max(...out.data.filter((_, i) => i % 4 !== 3)) >= 254);
});

test('auto-levels make a low-contrast render readable', () => {
  // A grey-on-grey portrait: without stretching, nearly every cell matches.
  const image = solid(32, 32, [90, 90, 90, 255]);
  for (let y = 0; y < 32; y++) {
    for (let x = 0; x < 32; x++) {
      if (x > 8 && x < 24 && y > 6 && y < 26) {
        const i = (y * 32 + x) * 4;
        image.data[i] = image.data[i + 1] = image.data[i + 2] = 96;
      }
    }
  }

  const spread = (levels) =>
    new Set(asciiArt(image, { columns: 16, levels }).lines.join('')).size;

  assert.ok(
    spread(true) > spread(false),
    'stretching should use more of the ramp',
  );
});

test('rendered lines never carry trailing whitespace', () => {
  for (const line of asciiArt(gradient(60, 60), { columns: 20 }).lines) {
    assert.equal(line, line.replace(/\s+$/, ''));
  }
});

/* ---------------------------------------------------------- config edit */

test('replaceAsciiBlock swaps the art and keeps the rest', () => {
  const config = [
    'export const profile = {',
    '  name: "Ada",',
    '',
    '  ascii: `',
    '      old art',
    '  `',
    "    .replace(/^\\n/, ''),",
    '',
    '  menu: [],',
    '};',
  ].join('\n');

  const out = replaceAsciiBlock(config, ['AAA', 'BBB']);
  assert.match(out, /AAA/);
  assert.match(out, /BBB/);
  assert.doesNotMatch(out, /old art/);
  assert.match(out, /\.replace\(\/\^\\n\/, ''\),/, 'chained .replace must survive');
  assert.match(out, /name: "Ada"/);
  assert.match(out, /menu: \[\]/);
});

test('replaceAsciiBlock strips ANSI from colour art', () => {
  const out = replaceAsciiBlock('  ascii: `x`,\n', [
    '\u001b[38;2;255;0;0m▀\u001b[0m',
  ]);
  assert.doesNotMatch(out, /\u001b/);
});

test('replaceAsciiBlock reports a config with no art', () => {
  assert.throws(() => replaceAsciiBlock('export const profile = {};', ['a']), /No ascii/);
});