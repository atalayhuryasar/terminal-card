import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

import { cardSvg } from '../scripts/demo.js';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const assets = [
  { columns: 84, file: path.join(root, 'docs', 'card.svg') },
  { columns: 52, file: path.join(root, 'docs', 'card-narrow.svg') },
];

test('the demo SVGs match what the CLI prints today', () => {
  for (const asset of assets) {
    const current = readFileSync(asset.file, 'utf8');
    const { width, height } = cardSvg(asset); // rewrites the file
    const regenerated = readFileSync(asset.file, 'utf8');
    assert.equal(
      regenerated,
      current,
      `${path.basename(asset.file)} is stale — run \`npm run demo\` and commit the result`,
    );
    assert.ok(width > 0 && height > 0);
  }
});

test('the demo SVGs contain no unrendered ANSI escapes', () => {
  for (const asset of assets) {
    const svg = readFileSync(asset.file, 'utf8');
    assert.ok(!svg.includes('\u001b'), `${asset.file} leaks a raw escape byte`);
  }
});

test('the demo SVGs are valid enough to parse as XML', () => {
  for (const asset of assets) {
    const svg = readFileSync(asset.file, 'utf8');
    assert.match(svg, /^<svg xmlns="http:\/\/www\.w3\.org\/2000\/svg"/);
    assert.match(svg, /<\/svg>\s*$/);
    // Every element that is not self-closing is closed.
    const tags = 'text|tspan|g|defs|linearGradient|stop|rect|circle|line';
    const open = (svg.match(new RegExp(`<(${tags})\\b[^>]*(?<!/)>`, 'g')) ?? []).length;
    const close = (svg.match(new RegExp(`</(${tags})>`, 'g')) ?? []).length;
    assert.equal(open, close, `${asset.file} has unbalanced elements`);
  }
});