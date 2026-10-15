/**
 * Zero-dependency ANSI helpers.
 *
 * Colour is decided from the environment: off when NO_COLOR is set or stdout
 * is not a TTY, on when FORCE_COLOR is set. The same module runs in a browser
 * — the web IDE on GitHub Pages uses it — where there is no `process`, and
 * where the host can force colour on or off with `setColor()`.
 */

const DEFAULT_PALETTE = [
  '#15151d', '#ff5f57', '#7bd88f', '#febc2e', '#6cb6ff', '#f78fd6', '#5fd7f2', '#d8dae4',
];

const env = globalThis.process?.env ?? {};
const stdout = globalThis.process?.stdout;

let forced = null;
let forcedTruecolor = null;

/** Force colour on or off, overriding the environment. Pass null to undo. */
export function setColor(on) {
  forced = on;
}

/**
 * Force 24-bit colour on or off. A browser has no TERM to inspect, and the
 * web preview wants the full gradient rather than a 256-colour approximation.
 */
export function setTruecolor(on) {
  forcedTruecolor = on;
}

export function colorEnabled() {
  if (forced !== null) return forced;
  if (env.NO_COLOR !== undefined && env.NO_COLOR !== '') return false;
  if (env.FORCE_COLOR !== undefined && env.FORCE_COLOR !== '0') return true;
  if (env.TERM === 'dumb') return false;
  return Boolean(stdout?.isTTY);
}

export function truecolor() {
  if (forcedTruecolor !== null) return forcedTruecolor && colorEnabled();
  if (!colorEnabled()) return false;
  if (env.COLORTERM === 'truecolor' || env.COLORTERM === '24bit') return true;
  return /-256(color)?$/i.test(env.TERM || '');
}

const wrap = (open, close) => (s) =>
  colorEnabled() ? `\u001b[${open}m${s}\u001b[${close}m` : String(s);

export const bold = wrap(1, 22);
export const dim = wrap(2, 22);
export const underline = wrap(4, 24);

const fg = (n) => (s) =>
  colorEnabled() ? `\u001b[38;5;${n}m${s}\u001b[39m` : String(s);

export const fgGreen = fg(2);
export const fgBlue = fg(4);
export const fgMagenta = fg(5);
export const fgCyan = fg(6);

/** Foreground colour from an RGB triple, downsampled when truecolor is absent. */
export const rgb = (r, g, b) => (s) => {
  if (!colorEnabled()) return String(s);
  if (truecolor()) return `\u001b[38;2;${r};${g};${b}m${s}\u001b[39m`;
  return fg(to256(r, g, b))(s);
};

function to256(r, g, b) {
  if (r === g && g === b) {
    if (r < 8) return 16;
    if (r > 248) return 231;
    return Math.round(((r - 8) / 247) * 24) + 232;
  }
  const q = (v) => Math.round((v / 255) * 5);
  return 16 + 36 * q(r) + 6 * q(g) + q(b);
}

/** Strip ANSI escape sequences from a string. */
export const stripAnsi = (s) => String(s).replace(/\u001b\[[0-9;]*m/g, '');

const isZeroWidth = (cp) =>
  cp === 0x200d || cp === 0xfe0f || cp === 0xfe0e || cp === 0xfeff;

const isWide = (cp) =>
  (cp >= 0x1100 && cp <= 0x115f) ||
  (cp >= 0x2e80 && cp <= 0xa4cf) ||
  (cp >= 0xac00 && cp <= 0xd7a3) ||
  (cp >= 0xf900 && cp <= 0xfaff) ||
  (cp >= 0xfe30 && cp <= 0xfe6f) ||
  (cp >= 0xff00 && cp <= 0xff60) ||
  (cp >= 0xffe0 && cp <= 0xffe6) ||
  (cp >= 0x1f300 && cp <= 0x1f64f) ||
  (cp >= 0x1f680 && cp <= 0x1f6ff) ||
  (cp >= 0x1f900 && cp <= 0x1f9ff) ||
  (cp >= 0x2600 && cp <= 0x27bf) ||
  (cp >= 0x2b00 && cp <= 0x2bff);

/** Terminal display width: ANSI is ignored, emoji and wide glyphs count as 2. */
export const visibleWidth = (s) => {
  let w = 0;
  for (const ch of stripAnsi(s)) {
    const cp = ch.codePointAt(0);
    if (isZeroWidth(cp)) continue;
    w += isWide(cp) ? 2 : 1;
  }
  return w;
};

/** Pad to a display width (not a code-unit length). */
export const padEnd = (s, n) =>
  s + ' '.repeat(Math.max(0, n - visibleWidth(s)));

export const padStart = (s, n) =>
  ' '.repeat(Math.max(0, n - visibleWidth(s))) + s;

/**
 * Split a line of ANSI-coloured text into styled runs.
 *
 * Used wherever the terminal output has to become something else — the SVG in
 * the README, and the live preview in the web IDE — so both show exactly what
 * a terminal would.
 *
 * @returns {{text:string, fg:string, bold:boolean, dim:boolean, underline:boolean}[]}
 */
export function parseRuns(line, { palette = DEFAULT_PALETTE } = {}) {
  const state = { fg: palette[7], bold: false, dim: false, underline: false };
  const runs = [];
  let buffer = '';
  let i = 0;

  const flush = () => {
    if (buffer) runs.push({ text: buffer, ...state });
    buffer = '';
  };

  while (i < line.length) {
    if (line[i] === '\u001b' && line[i + 1] === '[') {
      const end = line.indexOf('m', i);
      if (end !== -1) {
        flush();
        applySgr(line.slice(i + 2, end).split(';').map(Number), state, palette);
        i = end + 1;
        continue;
      }
    }
    buffer += line[i];
    i += 1;
  }
  flush();
  return runs;
}

function applySgr(codes, state, palette) {
  for (let i = 0; i < codes.length; i++) {
    const code = codes[i];
    if (code === 0) Object.assign(state, { fg: palette[7], bold: false, dim: false, underline: false });
    else if (code === 1) state.bold = true;
    else if (code === 2) state.dim = true;
    else if (code === 4) state.underline = true;
    else if (code === 22) {
      state.bold = false;
      state.dim = false;
    } else if (code === 24) state.underline = false;
    else if (code === 39) state.fg = palette[7];
    else if (code === 38 && codes[i + 1] === 2) {
      state.fg = `rgb(${codes[i + 2]}, ${codes[i + 3]}, ${codes[i + 4]})`;
      i += 4;
    } else if (code === 38 && codes[i + 1] === 5) {
      state.fg = palette[codes[i + 2]] ?? state.fg;
      i += 2;
    }
  }
}