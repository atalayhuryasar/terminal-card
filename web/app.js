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

/* =================================================================== zip == */

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c >>> 0;
  }
  return table;
})();

function crc32(bytes) {
  let c = 0xffffffff;
  for (const byte of bytes) c = CRC_TABLE[(c ^ byte) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

async function deflate(bytes) {
  if (typeof CompressionStream === 'undefined') return { bytes, method: 0 };
  try {
    const stream = new Blob([bytes])
      .stream()
      .pipeThrough(new CompressionStream('deflate-raw'));
    const out = new Uint8Array(await new Response(stream).arrayBuffer());
    return out.length < bytes.length ? { bytes: out, method: 8 } : { bytes, method: 0 };
  } catch {
    return { bytes, method: 0 };
  }
}

/** Build a ZIP archive in the browser. Store or deflate, no dependencies. */
async function zip(files) {
  const encoder = new TextEncoder();
  const parts = [];
  const central = [];
  let offset = 0;

  for (const file of files) {
    const name = encoder.encode(file.name);
    const raw = encoder.encode(file.text);
    const { bytes, method } = await deflate(raw);

    const header = new Uint8Array(30 + name.length);
    const view = new DataView(header.buffer);
    view.setUint32(0, 0x04034b50, true);
    view.setUint16(4, 20, true);
    view.setUint16(8, method, true);
    view.setUint32(14, crc32(raw), true);
    view.setUint32(18, bytes.length, true);
    view.setUint32(22, raw.length, true);
    view.setUint16(26, name.length, true);
    header.set(name, 30);

    parts.push(header, bytes);
    central.push({ name, crc: crc32(raw), size: bytes.length, raw: raw.length, offset });
    offset += header.length + bytes.length;
  }

  const directory = new Uint8Array(
    central.reduce((sum, f) => sum + 46 + f.name.length, 0),
  );
  const view = new DataView(directory.buffer);
  let cursor = 0;
  for (const f of central) {
    view.setUint32(cursor, 0x02014b50, true);
    view.setUint16(cursor + 4, 20, true);
    view.setUint16(cursor + 8, 8, true); // deflate
    view.setUint32(cursor + 16, f.crc, true);
    view.setUint32(cursor + 20, f.size, true);
    view.setUint32(cursor + 24, f.raw, true);
    view.setUint16(cursor + 28, f.name.length, true);
    view.setUint32(cursor + 42, f.offset, true);
    directory.set(f.name, cursor + 46);
    cursor += 46 + f.name.length;
  }

  const end = new Uint8Array(22);
  const endView = new DataView(end.buffer);
  endView.setUint32(0, 0x06054b50, true);
  endView.setUint16(8, central.length, true);
  endView.setUint16(10, central.length, true);
  endView.setUint32(12, directory.length, true);
  endView.setUint32(16, offset, true);

  return new Blob([...parts, directory, end], { type: 'application/zip' });
}

/* ============================================================== download == */

/** The files that make up a publishable package, besides the config. */
const RUNTIME_FILES = [
  'LICENSE',
  'bin/card.js',
  'src/ansi.js',
  'src/render.js',
  'src/menu.js',
  'src/open.js',
  'src/profile.js',
  'src/default.js',
];

const readme = (profile) => `# ${profile.packageName}

My terminal business card. Run \`npx ${profile.packageName}\`.

Built with [terminal-card](https://github.com/atalayhuryasar/terminal-card).

## License

MIT
`;

const publishGuide = (profile) => `# Publishing

Everything is ready. Three commands:

\`\`\`bash
cd ${profile.packageName}
npm login          # first time only
npm publish
\`\`\`

That is it — people can then run:

\`\`\`bash
npx ${profile.packageName}
\`\`\`

## Notes

- The package name must still be free: \`npm view ${profile.packageName}\`
  returns nothing when it is.
- \`npm publish\` asks for a one-time 2FA code.
- Package names cannot be changed after publishing.
- Want to change something later? Edit \`me.config.js\` and \`npm publish\` again.
`;

async function download() {
  const button = $('download');
  button.disabled = true;
  $('status').textContent = 'Building…';

  try {
    const files = [{ name: 'me.config.js', text: toConfig(state) }];

    for (const name of RUNTIME_FILES) {
      const response = await fetch(`../${name}`);
      if (!response.ok) throw new Error(`could not load ${name} (${response.status})`);
      files.push({ name, text: await response.text() });
    }

    files.push(
      {
        name: 'package.json',
        text: `${JSON.stringify(
          {
            name: state.packageName,
            version: '1.0.0',
            description: `${state.name}'s terminal business card. Run \`npx ${state.packageName}\`.`,
            keywords: ['cli', 'card', 'business-card', 'profile', 'terminal'],
            homepage: `https://www.npmjs.com/package/${state.packageName}`,
            license: 'MIT',
            author: state.name,
            type: 'module',
            bin: { [state.packageName]: 'bin/card.js' },
            files: ['bin', 'src', 'me.config.js', 'README.md', 'LICENSE'],
            engines: { node: '>=18' },
          },
          null,
          2,
        )}\n`,
      },
      { name: 'README.md', text: readme(state) },
      { name: 'PUBLISH.md', text: publishGuide(state) },
    );

    const blob = await zip(files);
    const url = URL.createObjectURL(blob);
    const link = el('a', { href: url, download: `${state.packageName}.zip` });
    document.body.append(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);

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
    preview();
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
    toConfig,
    fromConfig,
    checkPackageName,
    files: RUNTIME_FILES,
    loadRuntime: async () => {
      const out = [];
      for (const name of RUNTIME_FILES) {
        const response = await fetch(`../${name}`);
        out.push({ name, text: response.ok ? await response.text() : null });
      }
      return out;
    },
  };
}

init();