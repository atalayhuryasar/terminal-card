/**
 * Turn decoded pixels into ASCII art.
 *
 * Two renderers:
 *   mono   — one character per pixel block, brightness mapped to a ramp
 *   blocks — ANSI 24-bit colour using half blocks, twice the vertical detail
 *
 * Terminal cells are about twice as tall as they are wide, so the row count is
 * derived from that ratio. Get it wrong and portraits come out squashed.
 */

/** Characters are roughly 0.5 as wide as they are tall. */
export const CELL_RATIO = 0.5;

/**
 * Ramps run from the darkest look to the brightest, so a bright pixel maps to
 * the last character and a dark one to the first. On a dark terminal that
 * means light parts of the photo are solid and dark parts fade into the
 * background — the opposite of the "ink on paper" order.
 */
export const CHARSETS = {
  classic: ' .:-=+*#%@',
  blocks: ' .:-=+*#%@',
  simple: ' @Oo:.',
  minimal: ' Oo.',
  binary: ' 01:.',
  shade: '░▒▓█',
};

/**
 * Box-filter downscale. Averaging every source pixel that falls inside a
 * target pixel keeps faces from turning into noise at small sizes.
 */
export function resize(image, width, height) {
  const { width: sw, height: sh, data } = image;
  const out = Buffer.alloc(width * height * 4);

  for (let y = 0; y < height; y++) {
    const y0 = Math.floor((y * sh) / height);
    const y1 = Math.max(y0 + 1, Math.ceil(((y + 1) * sh) / height));

    for (let x = 0; x < width; x++) {
      const x0 = Math.floor((x * sw) / width);
      const x1 = Math.max(x0 + 1, Math.ceil(((x + 1) * sw) / width));

      let r = 0;
      let g = 0;
      let b = 0;
      let a = 0;
      let n = 0;

      for (let sy = y0; sy < y1 && sy < sh; sy++) {
        for (let sx = x0; sx < x1 && sx < sw; sx++) {
          const i = (sy * sw + sx) * 4;
          const alpha = data[i + 3] / 255;
          // Composite over white so transparent areas read as light, not black.
          r += data[i] * alpha + 255 * (1 - alpha);
          g += data[i + 1] * alpha + 255 * (1 - alpha);
          b += data[i + 2] * alpha + 255 * (1 - alpha);
          a += data[i + 3];
          n++;
        }
      }

      const o = (y * width + x) * 4;
      out[o] = Math.round(r / n);
      out[o + 1] = Math.round(g / n);
      out[o + 2] = Math.round(b / n);
      out[o + 3] = Math.round(a / n);
    }
  }

  return { width, height, data: out };
}

/** Rec. 709 relative luminance, 0 (black) to 255 (white). */
export function luminance(image) {
  const { width, height, data } = image;
  const out = new Float64Array(width * height);
  for (let i = 0, p = 0; i < data.length; i += 4, p++) {
    out[p] =
      0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2];
  }
  return out;
}

/** Row count that keeps the image undistorted in a terminal. */
export function rowsFor(columns, image, cellRatio = CELL_RATIO) {
  const ratio = image.height / image.width;
  return Math.max(1, Math.round((columns * ratio) / cellRatio));
}

/**
 * Classic single-character-per-cell art.
 *
 * @param {object} image   decoded RGBA image
 * @param {object} options columns, charset, invert, aspect
 */
export function renderMono(image, { columns = 40, charset = 'classic', invert = false, cellRatio = CELL_RATIO } = {}) {
  const ramp = CHARSETS[charset] ?? CHARSETS.classic;
  const rows = rowsFor(columns, image, cellRatio);
  const small = resize(image, columns, rows);
  const luma = luminance(small);

  const lines = [];
  for (let y = 0; y < rows; y++) {
    let line = '';
    for (let x = 0; x < columns; x++) {
      const value = luma[y * columns + x] / 255;
      // Ramps run dark -> bright, so brightness indexes straight into them.
      const t = invert ? 1 - value : value;
      line += ramp[Math.min(ramp.length - 1, Math.floor(t * ramp.length))];
    }
    lines.push(line);
  }
  return lines;
}

/**
 * Colour art: a half block per cell, foreground pixel on top, background
 * pixel underneath. Twice the vertical resolution of mono mode.
 *
 * @param {object} image   decoded RGBA image
 * @param {object} options columns, colour, invert, aspect
 */
export function renderBlocks(image, { columns = 40, color = true, invert = false, cellRatio = CELL_RATIO } = {}) {
  // Two pixel rows per character row, so the art has twice the vertical
  // detail of the mono renderer at the same apparent height.
  const lines = rowsFor(columns, image, cellRatio) * 2;
  const small = resize(image, columns, lines * 2);
  const ramp = CHARSETS.shade;

  const pixel = (x, y) => {
    const i = (y * small.width + x) * 4;
    return [small.data[i], small.data[i + 1], small.data[i + 2]];
  };

  const out = [];
  for (let line = 0; line < lines; line++) {
    let text = '';
    for (let x = 0; x < columns; x++) {
      const top = pixel(x, line * 2);
      const bottom = pixel(x, line * 2 + 1);

      if (!color) {
        const luma = (0.2126 * top[0] + 0.7152 * top[1] + 0.0722 * top[2]) / 255;
        const t = invert ? 1 - luma : luma;
        text += ramp[Math.min(ramp.length - 1, Math.floor(t * ramp.length))];
        continue;
      }

      text += `\u001b[38;2;${top[0]};${top[1]};${top[2]}m` +
        `\u001b[48;2;${bottom[0]};${bottom[1]};${bottom[2]}m\u2580`;
    }
    out.push(color ? text + '\u001b[0m' : text);
  }
  return out;
}

/**
 * Crop a centred window out of the image.
 *
 * `zoom` shrinks that window to a fraction of the original — portraits are
 * usually more readable zoomed in on the head — and `focus` decides whether
 * that window sits at the top, the middle or the bottom.
 */
export function crop(image, { zoom = 1, focus = 'center' } = {}) {
  if (zoom <= 1) return image;

  const w = Math.max(1, Math.round(image.width / zoom));
  const h = Math.max(1, Math.round(image.height / zoom));
  const x = Math.round((image.width - w) / 2);
  const y =
    focus === 'top' ? 0
    : focus === 'bottom' ? image.height - h
    : Math.round((image.height - h) / 2);

  const data = Buffer.alloc(w * h * 4);
  for (let row = 0; row < h; row++) {
    const from = ((y + row) * image.width + x) * 4;
    image.data.copy(data, row * w * 4, from, from + w * 4);
  }
  return { width: w, height: h, data };
}

/**
 * Crop the image so the result renders as exactly `rows` lines at `columns`
 * characters wide. This is what keeps a card portrait from becoming a
 * 40-line column: pick the height you want and the crop follows.
 */
export function fitRows(image, rows, columns, focus = 'center', cellRatio = CELL_RATIO) {
  if (!rows || rows < 1) return image;

  const targetRatio = (rows * cellRatio) / columns;
  const sourceRatio = image.height / image.width;

  const w = sourceRatio > targetRatio
    ? image.width
    : Math.max(1, Math.round(image.height / targetRatio));
  const h = sourceRatio > targetRatio
    ? Math.max(1, Math.round(image.width * targetRatio))
    : image.height;

  const x = Math.round((image.width - w) / 2);
  const y =
    focus === 'top' ? 0
    : focus === 'bottom' ? image.height - h
    : Math.round((image.height - h) / 2);

  const data = Buffer.alloc(w * h * 4);
  for (let row = 0; row < h; row++) {
    const from = ((y + row) * image.width + x) * 4;
    image.data.copy(data, row * w * 4, from, from + w * 4);
  }
  return { width: w, height: h, data };
}

/**
 * Entry point used by the CLI.
 * @returns {{lines: string[], columns: number, rows: number, mode: string}}
 */
export function asciiArt(image, options = {}) {
  const {
    columns = 40,
    mode = 'mono',
    charset = 'classic',
    invert = false,
    color = true,
    zoom = 1,
    focus = 'center',
    rows,
  } = options;

  const cropped = fitRows(crop(image, { zoom, focus }), rows, columns, focus);

  const lines =
    mode === 'blocks'
      ? renderBlocks(cropped, { columns, color, invert })
      : renderMono(cropped, { columns, charset, invert });

  return { lines, columns, rows: lines.length, mode };
}

/**
 * Replace the `ascii:` template literal in a config file, so generated art
 * can be dropped straight into me.config.js. Any chained `.replace()` calls
 * after the literal are left alone.
 */
export function replaceAsciiBlock(source, lines) {
  const pattern = /(^[ \t]*)ascii:[ \t]*`[\s\S]*?`/m;
  const found = source.match(pattern);
  if (!found) {
    throw new Error('No ascii: `...` block found in the config file');
  }

  const indent = /^[ \t]*/.exec(found[0])[0];
  const cleaned = lines.map((line) => line.replace(/\u001b\[[0-9;]*m/g, ''));

  return source.replace(
    pattern,
    indent + 'ascii: `\n' +
      cleaned.map((line) => indent + line).join('\n') +
      '\n' +
      indent.slice(0, -2) +
      '`',
  );
}
