/**
 * Renders the card to an SVG that can be embedded in the README.
 *
 * The SVG is generated from the real output, so it can never drift from
 * what the CLI actually prints. Regenerate with `npm run demo`.
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(here, '..');
const pkg = JSON.parse(readFileSync(path.join(root, 'package.json'), 'utf8'));

// Colour must be on, and in truecolor, before ansi.js is evaluated. Both are
// pinned so the output does not depend on the terminal this runs in.
process.env.FORCE_COLOR = '3';
process.env.COLORTERM = 'truecolor';
delete process.env.NO_COLOR;
delete process.env.TERM;
const { renderCard } = await import('../src/render.js');
const { parseRuns } = await import('../src/ansi.js');
const { profile } = await import('../src/profile.js');

const ESC = '\u001b';

/* ------------------------------------------------------------------ SVG */

const CHAR_W = 7.8;
const LINE_H = 19;
const FONT_SIZE = 13;
const PAD = 20;
const TITLEBAR = 34;
const SHELL = 46; // the fake prompt line above the card

/** One line of terminal output, as coloured tspans. */
function text(xPos, yPos, line) {
  const spans = parseRuns(line)
    .map((run) => {
      const attrs = [
        `fill="${run.fg}"`,
        run.bold ? 'font-weight="700"' : '',
        run.dim ? 'opacity="0.55"' : '',
        run.underline ? 'text-decoration="underline"' : '',
      ]
        .filter(Boolean)
        .join(' ');
      return `<tspan ${attrs}>${escape(run.text)}</tspan>`;
    })
    .join('');
  return `    <text x="${xPos}" y="${yPos}" xml:space="preserve">${spans}</text>`;
}

const escape = (s) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

export function cardSvg({ columns = 80, file = path.join(root, 'docs', 'card.svg') } = {}) {
  const card = renderCard(profile, columns);
  const lines = card.split('\n');
  const cols = Math.max(...lines.map((l) => l.replace(/\u001b\[[0-9;]*m/g, '').length));

  const width = Math.ceil(cols * CHAR_W + PAD * 2);
  const bodyHeight = lines.length * LINE_H;
  const height = TITLEBAR + SHELL + bodyHeight + PAD;

  const body = lines
    .map((line, row) => {
      const y = TITLEBAR + SHELL + row * LINE_H + FONT_SIZE;
      const spans = parseRuns(line)
        .map((run) => {
          const attrs = [
            `fill="${run.fg}"`,
            run.bold ? 'font-weight="700"' : '',
            run.dim ? 'opacity="0.55"' : '',
            run.underline ? 'text-decoration="underline"' : '',
          ]
            .filter(Boolean)
            .join(' ');
          return `<tspan ${attrs}>${escape(run.text)}</tspan>`;
        })
        .join('');
      return `    <text x="${PAD}" y="${y}" xml:space="preserve">${spans}</text>`;
    })
    .join('\n');

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-label="npx ${pkg.name} terminal card">
  <defs>
    <linearGradient id="chrome" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#2a2c38"/>
      <stop offset="1" stop-color="#22242e"/>
    </linearGradient>
  </defs>

  <rect width="${width}" height="${height}" rx="12" fill="#15161d"/>
  <rect width="${width}" height="${TITLEBAR}" rx="12" fill="url(#chrome)"/>
  <rect y="${TITLEBAR - 12}" width="${width}" height="12" fill="url(#chrome)"/>
  <line x1="0" y1="${TITLEBAR}" x2="${width}" y2="${TITLEBAR}" stroke="#31333f"/>

  <circle cx="18" cy="${TITLEBAR / 2}" r="5" fill="#ff5f57"/>
  <circle cx="36" cy="${TITLEBAR / 2}" r="5" fill="#febc2e"/>
  <circle cx="54" cy="${TITLEBAR / 2}" r="5" fill="#28c840"/>

  <text x="${width / 2}" y="${TITLEBAR / 2 + 4}" fill="#8b8ea3" font-size="11"
        font-family="ui-monospace, SFMono-Regular, Menlo, monospace" text-anchor="middle">terminal</text>

  <g font-family="ui-monospace, SFMono-Regular, Menlo, Consolas, monospace" font-size="${FONT_SIZE}">
    <text x="${PAD}" y="${TITLEBAR + SHELL - 16}" xml:space="preserve"><tspan fill="#7bd88f">$</tspan><tspan fill="#d8dae4"> npx ${pkg.name}</tspan></text>
${body}
  </g>
</svg>
`;

  mkdirSync(path.dirname(file), { recursive: true });
  writeFileSync(file, svg);
  return { file, width, height, columns: cols };
}

/**
 * A picture of the web editor for the README, drawn from the same data the
 * editor shows. Like `card.svg`, it is generated rather than screenshotted, so
 * it cannot show something the code does not do. Regenerate with `npm run demo`.
 */

/** An SVG illustration of the editor: a form on the left, the card on the right. */
export function editorSvg({ file = path.join(root, 'docs', 'editor.svg') } = {}) {
  const CW = 7.8; // character width at 13px
  const LH = 19;
  const MONO = 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace';
  const SANS = '-apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif';

  const W = 1080;
  const PAD = 22;
  const GUTTER = 18;

  const formWidth = 392;
  const termWidth = W - PAD * 2 - formWidth - GUTTER;

  // The card shown in the illustration is the example config, not the
  // template's own — the point is to show what somebody else's looks like.
  const example = {
    name: 'Ada Lovelace',
    handle: '@adalovelace',
    title: 'Mathematician',
    location: 'London',
    intro: ['Hello, this is *Ada Lovelace*, a `mathematician`.'],
  };

  const card = renderCard({ ...example, menu: [], exit: profile.exit }, 74).split('\n');
  const menu = [
    { icon: '', label: 'Do you want to learn more about me?', hint: '', selected: false, header: true },
    { icon: '❯ 🐙', label: 'My GitHub profile', hint: '(GitHub)', selected: true },
    { icon: '  🧰', label: 'Tools I maintain', hint: '(GitHub)', selected: false },
    { icon: '  ✉️', label: 'Send me an email', hint: '(mail)', selected: false },
    { icon: '  🌐', label: 'My website', hint: '(Web)', selected: false },
    { icon: '  👋', label: 'Bye.', hint: '', selected: false },
  ];

  const termLines = [...card, '', ...menu.map(m => m.label + (m.hint ? '  ' + m.hint : ''))];
  const termHeight = 34 + termLines.length * LH + 14;
  const height = Math.max(560, termHeight + PAD * 2 + 34);

  /* ------------------------------------------------------------- form --- */

  const fields = [
    ['NPM PACKAGE NAME', 'adalovelace', true],
    ['NAME', example.name, false],
    ['HANDLE', example.handle, false],
    ['TITLE', example.title, false],
    ['LOCATION', example.location, false],
    ['INTRO', example.intro[0].slice(0, 44) + '…', false, 62],
  ];

  let y = PAD + 46;
  let formBody = '';
  for (const [label, value, accent, boxHeight] of fields) {
    const h = boxHeight ?? 30;
    formBody += `
    <text x="${PAD}" y="${y}" fill="#7b8095" font-size="9.5" font-weight="600" letter-spacing="0.8" font-family="${SANS}">${label}</text>
    <rect x="${PAD}" y="${y + 8}" width="${formWidth}" height="${h}" rx="6" fill="#0d0e13" stroke="${accent ? '#787eff' : '#262a38'}"/>
    <text x="${PAD + 10}" y="${y + 8 + (h > 30 ? 20 : 19)}" fill="${accent ? '#ff5faf' : '#d8dae4'}" font-size="12" font-family="${MONO}">${escape(value)}</text>`;
    y += 8 + h + 16;
  }

  /* ---------------------------------------------------------- preview --- */

  const termX = PAD + formWidth + GUTTER;
  let termBody = '';
  card.forEach((line, index) => {
    termBody +=
      '\n' + text(termX + 12, PAD + 52 + index * LH, line);
  });

  let menuBody = '';
  const menuTop = PAD + 52 + card.length * LH + 10;
  menu.forEach((row, index) => {
    const selected = row.selected;
    const label = `${row.icon}${row.icon ? ' ' : ''}${row.label}`;
    const run = selected
      ? `[1;32m❯[39m ${escape(label)}  [34m${escape(row.hint)}[39m`
      : `[2m${escape(label)}  ${escape(row.hint)}[39m`;
    menuBody += '\n' + text(termX + 12, menuTop + index * LH, row.header ? `[1m${escape(row.label)}[39m` : run);
  });

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${height}" viewBox="0 0 ${W} ${height}" role="img" aria-label="The terminal-card web editor">
  <rect width="${W}" height="${height}" fill="#0d0e13"/>

  <!-- form panel -->
  <rect x="${PAD}" y="${PAD}" width="${formWidth}" height="${height - PAD * 2}" rx="10" fill="#14161f" stroke="#262a38"/>
  <rect x="${PAD}" y="${PAD}" width="${formWidth}" height="34" rx="10" fill="#1a1d28"/>
  <rect x="${PAD}" y="${PAD + 22}" width="${formWidth}" height="12" fill="#1a1d28"/>
  <line x1="${PAD}" y1="${PAD + 34}" x2="${PAD + formWidth}" y2="${PAD + 34}" stroke="#262a38"/>
  <rect x="${PAD + 12}" y="${PAD + 10}" width="54" height="15" rx="5" fill="#14161f" stroke="#262a38"/>
  <text x="${PAD + 39}" y="${PAD + 21}" fill="#d8dae4" font-size="9.5" font-family="${SANS}" text-anchor="middle">Form</text>
  <text x="${PAD + 78}" y="${PAD + 21}" fill="#7b8095" font-size="9.5" font-family="${MONO}">me.config.js</text>
${formBody}
  <!-- download button -->
  <rect x="${PAD}" y="${height - PAD - 34}" width="146" height="26" rx="6" fill="url(#btn)"/>
  <text x="${PAD + 73}" y="${height - PAD - 17}" fill="#ffffff" font-size="11" font-weight="600" font-family="${SANS}" text-anchor="middle">Download package</text>

  <!-- preview terminal -->
  <rect x="${termX}" y="${PAD}" width="${termWidth}" height="${termHeight}" rx="9" fill="#15161d" stroke="#262a38"/>
  <rect x="${termX}" y="${PAD}" width="${termWidth}" height="28" rx="9" fill="#22242e"/>
  <rect x="${termX}" y="${PAD + 16}" width="${termWidth}" height="12" fill="#22242e"/>
  <line x1="${termX}" y1="${PAD + 28}" x2="${termX + termWidth}" y2="${PAD + 28}" stroke="#31333f"/>
  <circle cx="${termX + 18}" cy="${PAD + 14}" r="4.5" fill="#ff5f57"/>
  <circle cx="${termX + 34}" cy="${PAD + 14}" r="4.5" fill="#febc2e"/>
  <circle cx="${termX + 50}" cy="${PAD + 14}" r="4.5" fill="#28c840"/>
  <text x="${termX + termWidth / 2}" y="${PAD + 18}" fill="#8b8ea3" font-size="10" font-family="${MONO}" text-anchor="middle">npx adalovelace</text>

  <g font-family="${MONO}" font-size="13">${termBody}${menuBody}
  </g>

  <defs>
    <linearGradient id="btn" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#ff5faf"/>
      <stop offset="1" stop-color="#787eff"/>
    </linearGradient>
  </defs>
</svg>
`;

  mkdirSync(file.replace(/\/[^/]+$/, ''), { recursive: true });
  writeFileSync(file, svg);
  return { file, width: W, height };
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const targets = [
    { columns: 84, file: path.join(root, 'docs', 'card.svg') },
    { columns: 52, file: path.join(root, 'docs', 'card-narrow.svg') },
  ];
  for (const target of targets) {
    const result = cardSvg(target);
    console.log(`${path.relative(root, result.file)}  ${result.width}x${result.height}`);
  }

  const editor = editorSvg();
  console.log(`${path.relative(root, editor.file)}  ${editor.width}x${editor.height}`);
}