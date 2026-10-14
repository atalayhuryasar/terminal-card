import test from 'node:test';
import assert from 'node:assert/strict';

import { visibleWidth, padEnd } from '../src/ansi.js';
import {
  parseMarkup,
  wrapMarkup,
  wrapSegments,
  renderSegments,
  renderCard,
  renderLinks,
  renderMenu,
} from '../src/render.js';
import { tokenize } from '../src/menu.js';
import { mergeProfile, profile } from '../src/profile.js';
import defaultProfile from '../src/default.js';

const plain = (s) => s.replace(/\u001b\[[0-9;]*m/g, '');

// A fixture so the suite never depends on the real me.config.js contents.
const fixture = {
  name: 'Test Person',
  handle: '@testperson',
  title: 'Tester',
  location: 'Nowhere',
  intro: ['Hello from *nowhere*.'],
  menu: [
    { icon: '🐙', label: 'Profile', hint: 'GitHub', url: 'https://github.com/test' },
  ],
  exit: { icon: '👋', label: 'Bye.' },
};

/* ------------------------------------------------------------------ ansi */

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
  const padded = ['🐙  a', '✉️  bb', '⭐  c'].map((r) => padEnd(r, 10));
  for (const row of padded) assert.equal(visibleWidth(row), 10);
});

/* --------------------------------------------------------------- markup */

test('parseMarkup understands every style token', () => {
  const segs = parseMarkup('a *b* `c` _d_ {e|f}');
  assert.deepEqual(
    segs.map((s) => s.text),
    ['a ', 'b', ' ', 'c', ' ', 'd', ' ', 'e'],
  );
  assert.equal(segs.find((s) => s.text === 'e').url, 'f');
});

test('parseMarkup leaves plain text alone', () => {
  assert.deepEqual(parseMarkup('just text'), [{ text: 'just text' }]);
});

test('parseMarkup tolerates unclosed markers', () => {
  assert.doesNotThrow(() => parseMarkup('*unclosed and `also this'));
});

/* ------------------------------------------------------------ wrapping */

test('wrapMarkup keeps every word and respects the width', () => {
  const out = wrapMarkup(['one two three four five six'], 12);
  assert.ok(out.length > 1);
  for (const line of out) assert.ok(visibleWidth(line) <= 12, `too wide: ${line}`);
  assert.equal(out.join(' ').replace(/\s+/g, ' '), 'one two three four five six');
});

test('wrapSegments keeps a word that spans styled segments whole when it fits', () => {
  // One word, three segments with different styles.
  const row = [
    { text: 'Tech', style: 'name' },
    { text: 'nolog', style: 'bold' },
    { text: 'ist', style: 'highlight' },
    { text: ' rocks' },
  ];
  const out = wrapSegments([row], 40).map(renderSegments);
  assert.equal(out.join(' ').replace(/\s+/g, ' '), 'Technologist rocks');
  assert.equal(out.length, 1, 'should not wrap');
});

test('wrapSegments breaks a spanning word across lines without splitting a segment', () => {
  const row = [
    { text: 'Tech', style: 'name' },
    { text: 'nologist', style: 'bold' },
  ];
  const out = wrapSegments([row], 6).map(renderSegments);
  assert.equal(out.join(''), 'Technologist');
  for (const line of out) assert.ok(visibleWidth(line) <= 6);
});

test('wrapMarkup breaks a word that cannot fit, without losing characters', () => {
  const source = 'supercalifragilistic';
  const out = wrapMarkup([`*${source}* end`], 10);
  assert.equal(out.join(''), source + 'end');
  for (const line of out) assert.ok(visibleWidth(line) <= 10);
});

test('wrapMarkup still places later words after a broken word', () => {
  const out = wrapMarkup(['supercalifragilistic end'], 10);
  assert.equal(out.join(''), 'supercalifragilisticend');
  assert.ok(out.length >= 2);
});

test('wrapMarkup preserves styling when breaking a long word', () => {
  const rows = wrapSegments([parseMarkup('*abcdefghijkl*')], 5);
  // 12 characters at 5 columns: 5 + 5 + 2, every fragment still bold.
  assert.equal(rows.length, 3);
  for (const row of rows) {
    assert.ok(row.length > 0);
    for (const segment of row) assert.equal(segment.style, 'bold');
  }
  const lines = rows.map(renderSegments);
  assert.equal(lines.join(''), 'abcdefghijkl');
  for (const line of lines) assert.ok(visibleWidth(line) <= 5);
});

test('wrapMarkup keeps empty lines as paragraph breaks', () => {
  const out = wrapMarkup(['a', '', 'b'], 40);
  assert.equal(out.length, 3);
  assert.equal(out[1], '');
});

test('wrapMarkup never emits trailing whitespace', () => {
  for (const line of wrapMarkup(['one two three four five'], 12)) {
    assert.equal(line, line.trimEnd());
  }
});

/* ------------------------------------------------------------ rendering */

test('renderCard never overflows, at any terminal width', () => {
  // Every width from "phone-sized" to ultrawide, with the real profile and a
  // deliberately hostile one (long url, long unbroken word).
  const hostile = {
    ...fixture,
    intro: [
      'https://example.com/a/very/long/path/that/never/ends?query=1&other=2',
      'supercalifragilisticexpialidocious',
      '*styled* `highlight` _dim_ {link label|https://example.com}',
    ],
    menu: [
      {
        icon: '🐙',
        label: 'An extremely long menu entry label for testing',
        hint: 'GitHub',
        url: 'https://example.com/very/long/url',
      },
    ],
  };

  for (const p of [profile, fixture, hostile]) {
    for (let columns = 6; columns <= 200; columns++) {
      for (const line of plain(renderCard(p, columns)).split('\n')) {
        assert.ok(
          visibleWidth(line) <= columns,
          `${columns} cols: line is ${visibleWidth(line)} wide -> ${JSON.stringify(line)}`,
        );
      }
    }
  }
});

test('renderCard drops the frame on a very narrow terminal', () => {
  const wide = plain(renderCard(fixture, 80));
  assert.match(wide, /^╭/, 'a framed card on a normal terminal');
  const tiny = plain(renderCard(fixture, 14));
  assert.doesNotMatch(tiny, /[╭│╰]/, 'too narrow to frame, so it prints plain');
  assert.match(tiny, /Test Person/);
});

test('renderCard renders the name, title and handle', () => {
  const out = plain(renderCard(fixture, 100));
  assert.match(out, /Test Person/);
  assert.match(out, /Tester/);
  assert.match(out, /@testperson/);
});

test('renderLinks lists every url', () => {
  const out = plain(renderLinks(fixture));
  assert.match(out, /https:\/\/github\.com\/test/);
});

test('renderMenu highlights the active row', () => {
  assert.match(plain(renderMenu('Pick', fixture.menu, 0)), /❯/);
});

test('renderMenu never prints an empty hint', () => {
  const noHint = [{ icon: '👋', label: 'Bye.' }];
  assert.doesNotMatch(renderMenu('Pick', noHint, 0), /\(\)/);
});

/* ---------------------------------------------------------------- input */

test('tokenize splits batched key presses but keeps escape sequences whole', () => {
  assert.deepEqual([...tokenize('\u001b[B\u001b[B\n')], ['\u001b[B', '\u001b[B', '\n']);
  assert.deepEqual([...tokenize('jk')], ['j', 'k']);
  assert.deepEqual([...tokenize('\u001b[A\u001b[5~')], ['\u001b[A', '\u001b[5~']);
});

test('tokenize passes multi-byte characters through intact', () => {
  assert.deepEqual([...tokenize('é🐙')], ['é', '🐙']);
});

/* -------------------------------------------------------------- profile */

test('mergeProfile fills gaps from the defaults', () => {
  const merged = mergeProfile(defaultProfile, { name: 'Only A Name' });
  assert.equal(merged.name, 'Only A Name');
  assert.ok(merged.intro.length > 0);
  assert.ok(merged.menu.length > 0);
});

test('mergeProfile replaces arrays wholesale instead of concatenating', () => {
  const merged = mergeProfile(defaultProfile, { intro: ['only mine'] });
  assert.deepEqual(merged.intro, ['only mine']);
});

test('mergeProfile keeps an omitted exit menu entry', () => {
  const merged = mergeProfile(defaultProfile, { name: 'x' });
  assert.deepEqual(merged.exit, defaultProfile.exit);
});

test('the shipped profile is well formed', () => {
  assert.ok(profile.name && profile.title, 'name and title are required');
  assert.ok(profile.intro.length > 0, 'intro is empty');
  assert.ok(profile.menu.length > 0, 'menu is empty');
  assert.ok(profile.exit?.label, 'exit item is missing');
  for (const item of profile.menu) {
    assert.ok(item.icon, 'menu item needs an icon');
    assert.ok(item.label, 'menu item needs a label');
    assert.match(
      item.url,
      /^(https?:|mailto:)/,
      `menu item url must be a link: ${item.url}`,
    );
  }
});

test('both profiles render without a portrait', () => {
  for (const p of [defaultProfile, profile]) {
    assert.equal(p.ascii, undefined, 'the card no longer takes art');
    assert.match(plain(renderCard(p, 80)), /╭/);
  }
});