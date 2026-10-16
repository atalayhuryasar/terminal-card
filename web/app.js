/**
 * terminal-card web IDE.
 *
 * The preview runs the same renderer the CLI does — `src/render.js` is
 * imported straight from the repository — so what you see here is exactly
 * what `npx <yourname>` will print.
 *
 * Nothing is uploaded. The config is evaluated in your browser and the
 * download is built here with a small ZIP writer.
 */
import { renderCard, renderMenu } from '../src/render.js';
import { setColor, setTruecolor, parseRuns, visibleWidth, stripAnsi } from '../src/ansi.js';
import { toConfig, fromConfig, checkPackageName } from './config.js';
import { zip, save } from './zip.js';
import { loadRuntime, packageFiles } from './package.js';

const $ = (id) => document.getElementById(id);
const el = (tag, attrs = {}, ...kids) => {
  const node = Object.assign(document.createElement(tag), attrs);
  for (const kid of kids) if (kid != null) node.append(kid);
  return node;
};

/* ============================================================== examples == */

const EXAMPLE = {
  name: 'Ada Lovelace',
  handle: '@adalovelace',
  title: 'Mathematician',
  location: 'London',
  intro: [
    'Hello, this is *Ada Lovelace*, a `mathematician`.',
    '',
    'I wrote the first algorithm intended for a machine, and I am currently thinking about {analytical engines|https://example.com} and how far they can actually go.',
  ],
  menu: [
    { icon: '🐙', label: 'My GitHub', hint: 'GitHub', url: 'https://github.com/adalovelace' },
    { icon: '✉️', label: 'Send me a note', hint: 'mail', url: 'mailto:ada@example.com' },
  ],
  exit: { icon: '👋', label: 'Bye.' },
};

const START = { packageName: 'adalovelace', ...EXAMPLE };

/* ================================================================= state == */

/** The live profile. The form writes here, the raw editor reads from it. */
let state = structuredClone(START);
let rawMode = false;

/* ================================================================ output == */

/** Turn one line of ANSI into HTML, preserving every styled run. */
function ansiToHtml(line) {
  if (stripAnsi(line) === '') return '&nbsp;';
  return parseRuns(line)
    .map((run) => {
      const css = [`color:${run.fg}`];
      if (run.bold) css.push('font-weight:700');
      if (run.dim) css.push('opacity:.55');
      if (run.underline) css.push('text-decoration:underline');
      const text = run.text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/ /g, '&nbsp;');
      return `<span style="${css.join(';')}">${text}</span>`;
    })
    .join('');
}

const preview = () => {
  const columns = Number($('width').value);
  $('widthOut').textContent = columns;

  const card = renderCard(state, columns);
  const menu = renderMenu('Do you want to learn more about me?', [
    ...state.menu,
    state.exit,
  ]);

  const lines = [`$ npx ${state.packageName || 'yourname'}`, '', ...card.split('\n'), '', ...menu.split('\n')];

  $('screen').replaceChildren(
    ...lines.map((line) => {
      const node = el('div', { className: 'line' });
      node.innerHTML = ansiToHtml(line);
      return node;
    }),
  );
  $('termTitle').textContent = `npx ${state.packageName || 'yourname'}`;
};

/* ================================================================== form == */

const FORM_FIELDS = ['packageName', 'name', 'handle', 'title', 'location'];

function readForm() {
  for (const key of FORM_FIELDS) state[key] = $(key).value;

  const problem = checkPackageName(state.packageName);
  $('packageHint').textContent =
    problem ?? 'Lowercase, no spaces. This is what people type.';
  $('packageHint').classList.toggle('is-bad', Boolean(problem));
  $('packageName').setAttribute('aria-invalid', String(Boolean(problem)));
  state.intro = $('intro').value.split('\n');
  state.menu = [...$('menuRows').querySelectorAll('.menu-row')].map((row) => {
    const [icon, label, hint, url] = row.querySelectorAll('input');
    return {
      icon: icon.value || '•',
      label: label.value,
      hint: hint.value,
      url: url.value,
    };
  });
  syncConfigBox();
  preview();
}

function writeForm() {
  for (const key of FORM_FIELDS) $(key).value = state[key] ?? '';
  $('packagePreview').textContent = state.packageName || 'yourname';
  $('intro').value = (state.intro ?? []).join('\n');

  $('menuRows').replaceChildren(
    ...(state.menu ?? []).map((item) => menuRow(item)),
  );
}

function menuRow(item = { icon: '🐙', label: '', hint: '', url: '' }) {
  const row = el('div', { className: 'menu-row' });
  const make = (value, placeholder) =>
    el('input', { value: value ?? '', placeholder, spellcheck: false });

  row.append(
    make(item.icon, '🦆'),
    make(item.label, 'Label'),
    make(item.hint, 'Hint'),
    make(item.url, 'https://…'),
    el('button', { className: 'remove', type: 'button', title: 'Remove' }, '×'),
  );

  row.querySelector('.remove').onclick = () => {
    row.remove();
    readForm();
  };
  return row;
}

/* ============================================================= raw config == */

/** Push the current state into the raw editor, unless it is being typed in. */
function syncConfigBox() {
  if (rawMode) return; // never overwrite what is being typed
  $('config').value = toConfig(state);
}

/* ================================================================== tabs == */

function showTab(name) {
  rawMode = name === 'config';
  for (const tab of document.querySelectorAll('.tab')) {
    tab.classList.toggle('is-active', tab.dataset.tab === name);
  }
  $('view-form').classList.toggle('is-hidden', rawMode);
  $('view-config').classList.toggle('is-hidden', !rawMode);
  if (rawMode) {
    state = { ...state, ...fromConfig($('config').value) };
    writeForm();
  } else {
    readForm();
  }
  preview();
}

/* ============================================================== download == */

async function download() {
  const button = $('download');
  button.disabled = true;
  $('status').textContent = 'Building…';

  try {
    const blob = await zip(packageFiles(state, await loadRuntime('../')));
    save(blob, `${state.packageName}.zip`);
    $('status').textContent = `Downloaded ${state.packageName}.zip`;
  } catch (error) {
    $('status').textContent = '';
    flash(`Could not build the package: ${error.message}`);
  } finally {
    button.disabled = false;
  }
}

/* ================================================================== glue == */

let flashTimer;
function flash(message) {
  const node = $('configError');
  node.textContent = message;
  node.classList.remove('is-hidden');
  clearTimeout(flashTimer);
  flashTimer = setTimeout(() => node.classList.add('is-hidden'), 4000);
}

function init() {
  setColor(true);
  setTruecolor(true);

  writeForm();
  syncConfigBox();
  preview();

  document.addEventListener('input', (event) => {
    if (rawMode && event.target.id === 'config') {
      try {
        state = { ...state, ...fromConfig(event.target.value) };
        $('configError').classList.add('is-hidden');
        preview();
      } catch (error) {
        $('configError').textContent = String(error.message).split('\n')[0];
        $('configError').classList.remove('is-hidden');
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
    $('menuRows').append(menuRow());
    readForm();
  };

  $('reset').onclick = () => {
    state = structuredClone(START);
    writeForm();
    syncConfigBox();
    preview();
    flash('Reset to the example.');
  };

  $('download').onclick = download;

  $('copyConfig').onclick = async () => {
    try {
      await navigator.clipboard.writeText(toConfig(state));
      $('status').textContent = 'Config copied.';
      setTimeout(() => ($('status').textContent = ''), 2000);
    } catch {
      flash('Clipboard blocked — select the text and copy it instead.');
    }
  };

  // Handy for anyone poking at it in the console, and used by the tests.
  globalThis.terminalCard = {
    get state() {
      return state;
    },
    renderCard,
    visibleWidth,
    zip,
    save,
    toConfig,
    fromConfig,
    checkPackageName,
    packageFiles,
    loadRuntime: () => loadRuntime('../'),
  };
}

init();