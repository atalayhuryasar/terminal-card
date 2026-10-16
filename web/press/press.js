/**
 * The "press" editor — same behaviour as the other one, different manners.
 *
 * Nothing here is special: the preview runs src/render.js, the config is read
 * and written by config.js, and the package is assembled by package.js. Only
 * the markup differs.
 */
import { renderCard, renderMenu } from '../../src/render.js';
import { setColor, setTruecolor, parseRuns, stripAnsi } from '../../src/ansi.js';
import { toConfig, fromConfig, checkPackageName } from '../config.js';
import { zip, save } from '../zip.js';
import { loadRuntime, packageFiles } from '../package.js';

const $ = (id) => document.getElementById(id);
const el = (tag, attrs = {}, ...kids) => {
  const node = Object.assign(document.createElement(tag), attrs);
  for (const kid of kids) if (kid != null) node.append(kid);
  return node;
};

const EXAMPLE = {
  name: 'Ada Lovelace',
  handle: '@adalovelace',
  title: 'Mathematician',
  location: 'London',
  intro: [
    'Hello, this is *Ada Lovelace*, a `mathematician`.',
    '',
    'I wrote the first algorithm intended for a machine, and I am still arguing about how far those things can actually go.',
  ],
  menu: [
    { icon: '🐙', label: 'My GitHub', hint: 'GitHub', url: 'https://github.com/adalovelace' },
    { icon: '✉️', label: 'Send me a note', hint: 'mail', url: 'mailto:ada@example.com' },
  ],
  exit: { icon: '👋', label: 'Bye.' },
};

const START = { packageName: 'adalovelace', ...EXAMPLE };

let state = structuredClone(START);
let rawMode = false;

/* --------------------------------------------------------------- output */

const ansiToHtml = (line) => {
  if (stripAnsi(line) === '') return '&nbsp;';
  return parseRuns(line)
    .map((run) => {
      const css = [`color:${run.fg}`];
      if (run.bold) css.push('font-weight:700');
      if (run.dim) css.push('opacity:.68');
      if (run.underline) css.push('text-decoration:underline');
      const text = run.text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/ /g, '&nbsp;');
      return `<span style="${css.join(';')}">${text}</span>`;
    })
    .join('');
};

function preview() {
  const columns = Number($('width').value);
  $('widthOut').textContent = columns;

  const lines = [
    `$ npx ${state.packageName || 'yourname'}`,
    '',
    ...renderCard(state, columns).split('\n'),
    '',
    ...renderMenu('Do you want to learn more about me?', [
      ...state.menu,
      state.exit,
    ]).split('\n'),
  ];

  $('screen').replaceChildren(
    ...lines.map((line) => {
      const node = el('div', { className: 'line' });
      node.innerHTML = ansiToHtml(line);
      return node;
    }),
  );

  $('termTitle').textContent = `npx ${state.packageName || 'yourname'}`;
}

/* ----------------------------------------------------------------- form */

const FIELDS = ['packageName', 'name', 'handle', 'title', 'location'];

function readForm() {
  for (const key of FIELDS) state[key] = $(key).value;

  const problem = checkPackageName(state.packageName);
  const hint = $('packageHint');
  hint.textContent = problem ?? 'this is what people will type';
  hint.classList.toggle('is-bad', Boolean(problem));
  $('packageName').setAttribute('aria-invalid', String(Boolean(problem)));

  state.intro = $('intro').value.split('\n');
  state.menu = [...$('menuRows').querySelectorAll('.link')].map((row) => {
    const [icon, label, hint, url] = row.querySelectorAll('input');
    return {
      icon: icon.value || '•',
      label: label.value,
      hint: hint.value,
      url: url.value,
    };
  });

  syncConfig();
  preview();
}

function writeForm() {
  for (const key of FIELDS) $(key).value = state[key] ?? '';
  $('intro').value = (state.intro ?? []).join('\n');
  $('menuRows').replaceChildren(...(state.menu ?? []).map((item) => linkRow(item)));
}

function linkRow(item = { icon: '🐙', label: '', hint: '', url: '' }) {
  const row = el('div', { className: 'link' });
  const field = (value, placeholder) =>
    el('input', { value: value ?? '', placeholder, spellcheck: false });

  row.append(
    field(item.icon, 'icon'),
    field(item.label, 'label'),
    field(item.hint, 'hint'),
    field(item.url, 'https://…'),
    el('button', { className: 'drop', type: 'button', title: 'Remove' }, '×'),
  );

  row.querySelector('.drop').onclick = () => {
    row.remove();
    readForm();
  };
  return row;
}

/* --------------------------------------------------------- raw config */

function syncConfig() {
  if (rawMode) return; // never overwrite what is being typed
  $('config').value = toConfig(state);
}

/* ---------------------------------------------------------------- tabs */

function showTab(name) {
  rawMode = name === 'config';
  for (const tab of document.querySelectorAll('.tab')) {
    tab.classList.toggle('is-on', tab.dataset.tab === name);
  }
  $('view-form').hidden = rawMode;
  $('view-config').hidden = !rawMode;

  if (rawMode) {
    state = { ...state, ...fromConfig($('config').value) };
    writeForm();
  } else {
    readForm();
  }
  preview();
}

/* ------------------------------------------------------------ download */

async function download() {
  const button = $('download');
  button.disabled = true;
  $('status').textContent = 'assembling…';

  try {
    const blob = await zip(packageFiles(state, await loadRuntime('../../')));
    save(blob, `${state.packageName}.zip`);
    $('status').textContent = `${state.packageName}.zip saved`;
  } catch (error) {
    $('status').textContent = '';
    fault(`Could not build the package: ${error.message}`);
  } finally {
    button.disabled = false;
  }
}

let faultTimer;
function fault(message) {
  const node = $('configError');
  node.textContent = message;
  node.hidden = false;
  clearTimeout(faultTimer);
  faultTimer = setTimeout(() => (node.hidden = true), 5000);
}

/* ---------------------------------------------------------------- glue */

function init() {
  setColor(true);
  setTruecolor(true);

  writeForm();
  syncConfig();
  preview();

  document.addEventListener('input', (event) => {
    if (rawMode && event.target.id === 'config') {
      try {
        state = { ...state, ...fromConfig(event.target.value) };
        $('configError').hidden = true;
        writeForm();
        preview();
      } catch (error) {
        const node = $('configError');
        node.textContent = String(error.message).split('\n')[0];
        node.hidden = false;
      }
      return;
    }
    readForm();
  });

  for (const tab of document.querySelectorAll('.tab')) {
    tab.onclick = () => showTab(tab.dataset.tab);
  }

  $('width').oninput = preview;

  $('toggleColor').onclick = () => {
    const on = $('toggleColor').getAttribute('aria-pressed') === 'true';
    setColor(on);
    setTruecolor(on);
    $('toggleColor').setAttribute('aria-pressed', String(!on));
    preview();
  };

  $('addLink').onclick = () => {
    $('menuRows').append(linkRow());
    readForm();
  };

  $('reset').onclick = () => {
    state = structuredClone(START);
    writeForm();
    syncConfig();
    preview();
    $('status').textContent = 'back to the example';
    setTimeout(() => ($('status').textContent = ''), 2000);
  };

  $('download').onclick = download;

  $('copyConfig').onclick = async () => {
    try {
      await navigator.clipboard.writeText(toConfig(state));
      $('status').textContent = 'config copied';
      setTimeout(() => ($('status').textContent = ''), 2000);
    } catch {
      fault('The browser blocked the clipboard — select the text and copy it.');
    }
  };

  globalThis.terminalCard = {
    get state() {
      return state;
    },
    renderCard,
    zip,
    toConfig,
    fromConfig,
    packageFiles,
    loadRuntime: () => loadRuntime('../../'),
  };
}

init();