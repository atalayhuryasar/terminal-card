import test from 'node:test';
import assert from 'node:assert/strict';

import { visibleWidth, padEnd } from '../src/ansi.js';
import { parseMarkup, wrapMarkup, renderCard, dedent, renderMenu } from '../src/render.js';
import { tokenize } from '../src/menu.js';
import profile from '../src/data.js';

const plain = (s) => s.replace(/\u001b\[[0-9;]*m/g, '');

test('visibleWidth ignores ANSI codes', () => {
  assert.equal(visibleWidth('\u001b[38;5;205mabc\u001b[39m'), 3);
});

test('visibleWidth counts emoji as two columns', () => {
  assert.equal(visibleWidth('🐙'), 2);
  assert.equal(visibleWidth('✉️'), 2);
  assert.equal(visibleWidth('⭐'), 2);
  assert.equal(visibleWidth('ab'), 2);
});

test('padEnd aligns on display width, not code units', () => {
  const rows = ['🐙  a', '✉️  bb', '⭐  c'];
  const padded = rows.map((r) => padEnd(r, 10));
  assert.equal(visibleWidth(padded[0]), 10);
  assert.equal(visibleWidth(padded[1]), 10);
  assert.equal(visibleWidth(padded[2]), 10);
});

test('parseMarkup understands every style token', () => {
  const segs = parseMarkup('a *b* `c` _d_ {e|f}');
  assert.deepEqual(
    segs.map((s) => s.text),
    ['a ', 'b', ' ', 'c', ' ', 'd', ' ', 'e'],
  );
  assert.equal(segs.find((s) => s.text === 'e').url, 'f');
});

test('wrapMarkup keeps every word and respects the width', () => {
  const out = wrapMarkup(['one two three four five six'], 12);
  assert.ok(out.length > 1);
  for (const line of out) assert.ok(visibleWidth(line) <= 12, `too wide: ${line}`);
  assert.equal(out.join(' ').replace(/\s+/g, ' '), 'one two three four five six');
});

test('wrapMarkup does not break words that span styled segments', () => {
  const out = wrapMarkup(['*Creative Technologist* rocks'], 10);
  assert.equal(out.join(' ').replace(/\s+/g, ' '), 'Creative Technologist rocks');
});

test('wrapMarkup keeps empty lines as paragraph breaks', () => {
  const out = wrapMarkup(['a', '', 'b'], 40);
  assert.equal(out.length, 3);
  assert.equal(out[1], '');
});

test('dedent removes shared indentation only', () => {
  assert.equal(dedent('    a\n      b'), 'a\n  b');
});

test('renderCard fits the requested terminal width', () => {
  for (const columns of [60, 80, 100, 160]) {
    const out = plain(renderCard(profile, columns));
    for (const line of out.split('\n')) {
      assert.ok(
        visibleWidth(line) <= columns,
        `${columns} cols: line is ${visibleWidth(line)} wide -> ${line}`,
      );
    }
  }
});

test('renderCard contains the essential info', () => {
  const out = plain(renderCard(profile, 100));
  assert.match(out, /Atalay Hüryaşar/);
  assert.match(out, /Creative Technologist/);
  assert.match(out, /@atalayhuryasar/);
});

test('renderMenu highlights the active row', () => {
  const out = plain(renderMenu('Pick one', profile.menu, 1));
  assert.match(out, /❯/);
});

test('renderMenu never prints an empty hint', () => {
  const out = renderMenu('Pick one', profile.menu, profile.menu.length);
  assert.doesNotMatch(out, /\(\)/);
});

test('tokenize splits batched key presses but keeps escape sequences whole', () => {
  assert.deepEqual([...tokenize('\u001b[B\u001b[B\n')], [
    '\u001b[B',
    '\u001b[B',
    '\n',
  ]);
  assert.deepEqual([...tokenize('jk')], ['j', 'k']);
  assert.deepEqual([...tokenize('\u001b[A\u001b[5~')], ['\u001b[A', '\u001b[5~']);
});

test('profile data is well formed', () => {
  assert.ok(profile.name && profile.title && profile.location);
  assert.ok(profile.ascii.length > 20);
  assert.ok(profile.menu.length > 0);
  for (const item of profile.menu) {
    assert.ok(item.icon, 'menu item needs an icon');
    assert.ok(item.label, 'menu item needs a label');
    assert.match(item.url, /^(https?:|mailto:)/, `bad url: ${item.url}`);
  }
  for (const url of profile.menu.map((i) => i.url)) {
    assert.ok(new URL(url), `unparsable url: ${url}`);
  }
});