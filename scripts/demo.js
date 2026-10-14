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
const { profile } = await import('../src/profile.js');

const ESC = '\u001b';

/* ------------------------------------------------------------- ANSI scan */

const PALETTE = {
  2: '#7bd88f',
  4: '#6cb6ff',
  5: '#f78fd6',
  6: '#5fd7f2',
};

const state = { fg: '#d8dae4', bold: false, dim: false, underline: false };

/** Split one line into runs of { text, fg, bold, dim, underline }. */
function parseAnsi(line) {
  const runs = [];
  let buffer = '';
  let i = 0;

  const push = () => {
    if (buffer) runs.push({ text: buffer, ...state });
    buffer = '';
  };

  while (i < line.length) {
    if (line[i] === ESC && line[i + 1] === '[') {
      const end = line.indexOf('m', i);
      if (end !== -1) {
        push();
        applyCodes(line.slice(i + 2, end).split(';').map(Number));
        i = end + 1;
        continue;
      }
    }
    buffer += line[i];
    i++;
  }
  push();
  return runs;
}

function applyCodes(codes) {
  for (let i = 0; i < codes.length; i++) {
    const code = codes[i];
    if (code === 0) {
      Object.assign(state, { fg: '#d8dae4', bold: false, dim: false, underline: false });
    } else if (code === 1) state.bold = true;
    else if (code === 2) state.dim = true;
    else if (code === 4) state.underline = true;
    else if (code === 22) {
      state.bold = false;
      state.dim = false;
    } else if (code === 24) state.underline = false;
    else if (code === 39) state.fg = '#d8dae4';
    else if (code === 38 && codes[i + 1] === 2) {
      state.fg = `rgb(${codes[i + 2]}, ${codes[i + 3]}, ${codes[i + 4]})`;
      i += 4;
    } else if (code === 38 && codes[i + 1] === 5) {
      state.fg = PALETTE[codes[i + 2]] ?? state.fg;
      i += 2;
    }
  }
}

/* ------------------------------------------------------------------ SVG */

const CHAR_W = 7.8;
const LINE_H = 19;
const FONT_SIZE = 13;
const PAD = 20;
const TITLEBAR = 34;
const SHELL = 46; // the fake prompt line above the card

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
      const spans = parseAnsi(line)
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

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const targets = [
    { columns: 84, file: path.join(root, 'docs', 'card.svg') },
    { columns: 52, file: path.join(root, 'docs', 'card-narrow.svg') },
  ];
  for (const target of targets) {
    const result = cardSvg(target);
    console.log(`${path.relative(root, result.file)}  ${result.width}x${result.height}`);
  }
}