/**
 * Zero-dependency ANSI helpers.
 * Colour is auto-disabled when stdout is not a TTY or NO_COLOR is set.
 */

const env = process.env;

export const colorEnabled = (() => {
  if (env.NO_COLOR !== undefined && env.NO_COLOR !== '') return false;
  if (env.FORCE_COLOR !== undefined && env.FORCE_COLOR !== '0') return true;
  if (env.TERM === 'dumb') return false;
  return Boolean(process.stdout.isTTY);
})();

export const truecolor = (() => {
  if (!colorEnabled) return false;
  if (env.COLORTERM === 'truecolor' || env.COLORTERM === '24bit') return true;
  return /-256(color)?$/i.test(env.TERM || '');
})();

const wrap = (open, close) => (s) =>
  colorEnabled ? `\u001b[${open}m${s}\u001b[${close}m` : String(s);

export const bold = wrap(1, 22);
export const dim = wrap(2, 22);
export const underline = wrap(4, 24);

const fg = (n) => (s) =>
  colorEnabled ? `\u001b[38;5;${n}m${s}\u001b[39m` : String(s);

export const fgGreen = fg(2);
export const fgBlue = fg(4);
export const fgMagenta = fg(5);
export const fgCyan = fg(6);

/** Foreground colour from an RGB triple, downsampled when truecolor is absent. */
export const rgb = (r, g, b) => (s) => {
  if (!colorEnabled) return String(s);
  if (truecolor) return `\u001b[38;2;${r};${g};${b}m${s}\u001b[39m`;
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
