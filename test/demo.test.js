import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

import { cardSvg, editorSvg } from '../scripts/demo.js';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');

const assets = [
  { columns: 84, file: path.join(root, 'docs', 'card.svg') },
  { columns: 52, file: path.join(root, 'docs', 'card-narrow.svg') },
];
const editorAsset = { file: path.join(root, 'docs', 'editor.svg') };
const everything = [...assets, editorAsset];

const SVG_ELEMENTS = 'text|tspan|g|defs|linearGradient|stop|rect|circle|line';

test('the demo SVGs match what the CLI prints today', () => {
  for (const asset of assets) {
    const current = readFileSync(asset.file, 'utf8');
    const { width, height } = cardSvg(asset); // rewrites the file
    assert.equal(
      readFileSync(asset.file, 'utf8'),
      current,
      `${path.basename(asset.file)} is stale — run \`npm run demo\` and commit the result`,
    );
    assert.ok(width > 0 && height > 0);
  }
});

test("the editor illustration matches the editor's own renderer", () => {
  const current = readFileSync(editorAsset.file, 'utf8');
  editorSvg(editorAsset); // rewrites it
  assert.equal(
    readFileSync(editorAsset.file, 'utf8'),
    current,
    'editor.svg is stale — run `npm run demo` and commit the result',
  );
});

test('the demo SVGs contain no unrendered ANSI escapes', () => {
  for (const asset of everything) {
    const svg = readFileSync(asset.file, 'utf8');
    assert.ok(!svg.includes('\u001b'), `${asset.file} leaks a raw escape byte`);
  }
});

test('every generated SVG is complete enough to render', () => {
  for (const asset of everything) {
    const svg = readFileSync(asset.file, 'utf8');
    const name = path.basename(asset.file);

    assert.match(svg, /^<svg xmlns="http:\/\/www\.w3\.org\/2000\/svg"/, `${name} has no root`);
    assert.match(svg, /<\/svg>\s*$/, `${name} is truncated`);

    // An unescaped & or < is the usual way hand-written SVG breaks, and the
    // browser drops the whole image without saying why.
    assert.doesNotMatch(svg, /&(?!amp;|lt;|gt;|quot;|apos;|#\d+;|#x[0-9a-f]+;)/i, `${name} has a bare &`);

    // Every element that is not self-closing must be closed.
    const open = (svg.match(new RegExp(`<(${SVG_ELEMENTS})\\b[^>]*(?<!/)>`, 'g')) ?? []).length;
    const close = (svg.match(new RegExp(`</(${SVG_ELEMENTS})>`, 'g')) ?? []).length;
    assert.equal(open, close, `${name} has unbalanced elements`);
  }
});

test('the editor illustration actually shows a card', () => {
  const svg = readFileSync(editorAsset.file, 'utf8');
  assert.match(svg, /Ada Lovelace/);
  assert.match(svg, /My GitHub/);
  assert.ok(svg.includes('<tspan'), 'the terminal output should be coloured');
});