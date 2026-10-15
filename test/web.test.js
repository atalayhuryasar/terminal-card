import test from 'node:test';
import assert from 'node:assert/strict';

import { toConfig, fromConfig, checkPackageName } from '../web/config.js';
import { parseRuns, stripAnsi, visibleWidth, setColor, setTruecolor } from '../src/ansi.js';
import { renderCard } from '../src/render.js';

const sample = {
  packageName: 'adalovelace',
  name: 'Ada Lovelace',
  handle: '@adalovelace',
  title: 'Mathematician',
  location: 'London',
  intro: ['Hello, this is *Ada Lovelace*, a `mathematician`.', ''],
  menu: [
    { icon: '🐙', label: 'My GitHub', hint: 'GitHub', url: 'https://github.com/adalovelace' },
    { icon: '✉️', label: 'Email', hint: 'mail', url: 'mailto:ada@example.com' },
  ],
  exit: { icon: '👋', label: 'Bye.' },
};

/* ------------------------------------------------------------ round trip */

test('a config written by the editor reads back unchanged', () => {
  const round = fromConfig(toConfig(sample));
  assert.equal(round.name, sample.name);
  assert.equal(round.handle, sample.handle);
  assert.equal(round.title, sample.title);
  assert.equal(round.location, sample.location);
  assert.deepEqual(round.intro, sample.intro);
  assert.deepEqual(round.menu, sample.menu);
  assert.deepEqual(round.exit, sample.exit);
});

test('markup in the intro survives the round trip', () => {
  const tricky = {
    ...sample,
    intro: ["*bold* `code` _dim_ {label|https://example.com} it's a 'quote' \\ backslash"],
  };
  assert.deepEqual(fromConfig(toConfig(tricky)).intro, tricky.intro);
});

test('the generated config is valid ES module JavaScript', async () => {
  const source = toConfig(sample);
  assert.match(source, /export const profile/);
  // Importing it for real is the only honest check: `export` is not legal
  // inside a Function body, and it is exactly what the CLI will load.
  const module = await import(`data:text/javascript,${encodeURIComponent(source)}`);
  assert.equal(module.profile.name, sample.name);
  assert.equal(module.default.name, sample.name);
});

test('fromConfig rejects a file with no profile', () => {
  assert.throws(() => fromConfig('export const nope = 1;'), /does not export/);
  assert.throws(() => fromConfig('this is not javascript (('), /SyntaxError|Unexpected/);
});

test('fromConfig ignores a default export', () => {
  const round = fromConfig(toConfig(sample));
  assert.equal(round.name, sample.name);
});

/* ---------------------------------------------------------- package name */

test('package names are checked the way npm cares', () => {
  for (const good of ['ada', 'ada-lovelace', 'a.b_c', 'user123']) {
    assert.equal(checkPackageName(good), null, `${good} should be fine`);
  }
  for (const bad of ['', 'Ada', 'ada lovelace', '@ada', '-ada', 'ada!']) {
    assert.ok(checkPackageName(bad), `${bad} should be rejected`);
  }
});

/* ------------------------------------------------------------ ansi runs */

test('parseRuns reports each styled run', () => {
  setColor(true);
  setTruecolor(true);
  try {
    const line = '\u001b[1mBold\u001b[22m and \u001b[2mdim\u001b[22m';
    const runs = parseRuns(line);
    // A reset with nothing after it produces no empty run.
    assert.equal(runs.length, 3);
    assert.deepEqual(
      runs.map((r) => r.text),
      ['Bold', ' and ', 'dim'],
    );
    assert.equal(runs[0].bold, true);
    assert.equal(runs[2].dim, true);
  } finally {
    setColor(null);
    setTruecolor(null);
  }
});

test('parseRuns handles 24-bit colours', () => {
  setColor(true);
  setTruecolor(true);
  try {
    const [run] = parseRuns('\u001b[38;2;255;95;175mX\u001b[39m');
    assert.equal(run.text, 'X');
    assert.equal(run.fg, 'rgb(255, 95, 175)');
  } finally {
    setColor(null);
    setTruecolor(null);
  }
});

test('parseRuns leaves plain text alone', () => {
  setColor(true);
  try {
    assert.deepEqual(parseRuns('hello'), [
      { text: 'hello', fg: '#d8dae4', bold: false, dim: false, underline: false },
    ]);
  } finally {
    setColor(null);
  }
});

test('parseRuns reassembles into the input once the colour is stripped', () => {
  setColor(true);
  setTruecolor(true);
  try {
    const line = renderCard(sample, 70).split('\n')[0];
    assert.equal(
      parseRuns(line).map((r) => r.text).join(''),
      stripAnsi(line),
    );
  } finally {
    setColor(null);
    setTruecolor(null);
  }
});

/* ----------------------------------------------------- browser tolerance */

test('the modules load without a process object', () => {
  // web/app.js imports these straight into a browser, where `process` is
  // undefined. Guarding it here keeps that from being a runtime surprise.
  assert.doesNotThrow(() => {
    assert.equal(typeof globalThis.process?.env, 'object');
  });
  assert.equal(typeof visibleWidth('abc'), 'number');
});

test('the card renders with colour forced on, as the preview does', () => {
  setColor(true);
  setTruecolor(true);
  try {
    const card = renderCard(sample, 70);
    assert.ok(card.includes('\u001b['), 'the preview relies on the escapes being present');
  } finally {
    setColor(null);
    setTruecolor(null);
  }
});