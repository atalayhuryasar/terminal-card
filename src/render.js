import {
  bold,
  dim,
  underline,
  fgMagenta,
  fgCyan,
  fgBlue,
  fgGreen,
  rgb,
  visibleWidth,
  padEnd,
  padStart,
  colorEnabled,
} from './ansi.js';
import { profile } from './profile.js';

const ACCENT = [255, 95, 175]; // hot pink
const ACCENT_END = [120, 130, 255]; // soft violet

/** Interpolate between two RGB triples. */
const mix = (a, b, t) => [
  Math.round(a[0] + (b[0] - a[0]) * t),
  Math.round(a[1] + (b[1] - a[1]) * t),
  Math.round(a[2] + (b[2] - a[2]) * t),
];

const slice = (s) => s.slice(1, s.length - 1);

/**
 * Parse the mini markup used in `me.config.js` into styled segments.
 *   *bold accent*   _dim_   `highlight`   {label|url}
 */
export function parseMarkup(line) {
  const segments = [];
  const token =
    /(\*[^*\n]+\*)|(`[^`\n]+`)|(_[^_\n]+_)|(\{([^}|\n]+)\|([^}\n]+)\})/g;
  let last = 0;
  let match;

  while ((match = token.exec(line)) !== null) {
    if (match.index > last) {
      segments.push({ text: line.slice(last, match.index) });
    }
    const [full, b, highlight, faint, link, label, url] = match;
    if (b) segments.push({ text: slice(b), style: 'bold' });
    else if (highlight) segments.push({ text: slice(highlight), style: 'highlight' });
    else if (faint) segments.push({ text: slice(faint), style: 'dim' });
    else if (link) segments.push({ text: label.trim(), style: 'link', url });
    last = match.index + full.length;
  }
  if (last < line.length) segments.push({ text: line.slice(last) });
  return segments;
}

export function renderSegments(segments) {
  return segments
    .map(({ text, style }) => {
      switch (style) {
        case 'bold':
          return bold(rgb(...ACCENT)(text));
        case 'name':
          return bold(rgb(...ACCENT)(text));
        case 'role':
          return bold(rgb(...ACCENT_END)(text));
        case 'location':
          return fgBlue(text);
        case 'highlight':
          return fgMagenta(bold(text));
        case 'dim':
          return dim(text);
        case 'link':
          return colorEnabled ? fgCyan(underline(text)) : text;
        default:
          return text;
      }
    })
    .join('');
}

/** Render one source line, markup included. */
export const renderLine = (line) => renderSegments(parseMarkup(line));

/**
 * Split a too-long word into chunks that each fit in `width` columns,
 * preserving the styling of every fragment.
 */
function hardBreak(parts, width) {
  const chunks = [];
  let current = [];
  let w = 0;

  const take = (segment) => {
    for (const ch of segment.text) {
      const cw = visibleWidth(ch);
      if (w + cw > width && current.length) {
        chunks.push(current);
        current = [];
        w = 0;
      }
      current.push({ text: ch, style: segment.style, url: segment.url });
      w += cw;
    }
  };

  for (const segment of parts) take(segment);
  if (current.length) chunks.push(current);
  return chunks;
}

/**
 * Word-wrap already-parsed segment rows, without losing styling.
 * A word split across several styled segments stays together.
 * Each row is a list of `{ text, style }` segments; `[]` is a blank line.
 */
export function wrapSegments(rows, width) {
  const out = [];

  for (const row of rows) {
    const atoms = [];
    let word = [];

    for (const seg of row) {
      for (const part of seg.text.split(/(\s+)/)) {
        if (part === '') continue;
        if (/^\s+$/.test(part)) {
          if (word.length) atoms.push({ type: 'word', parts: word }), (word = []);
          atoms.push({ type: 'space', parts: [{ text: part }] });
        } else {
          word.push({ text: part, style: seg.style, url: seg.url });
        }
      }
    }
    if (word.length) atoms.push({ type: 'word', parts: word });
    if (!atoms.length) {
      out.push([]); // blank line
      continue;
    }

    let current = [];
    let w = 0;
    const flush = () => {
      // Drop trailing whitespace so the box padding is not counted twice.
      while (current.length && current.at(-1).type === 'space') current.pop();
      out.push(current.flatMap((a) => a.parts));
      current = [];
      w = 0;
    };

    for (let index = 0; index < atoms.length; index++) {
      const atom = atoms[index];
      const atomWidth =
        atom.type === 'space'
          ? visibleWidth(atom.parts[0].text)
          : visibleWidth(renderSegments(atom.parts));

      // A single word wider than the line (a long url, a narrow terminal)
      // has to be broken, otherwise it overflows the box. It always starts on
      // a fresh line, because the leftover space is rarely enough to use.
      if (atom.type === 'word' && atomWidth > width) {
        if (current.length) flush();
        const chunks = hardBreak(atom.parts, width);
        chunks.forEach((chunk, chunkIndex) => {
          if (chunkIndex > 0) flush();
          for (const segment of chunk) {
            current.push({ type: 'word', parts: [segment] });
            w += visibleWidth(segment.text);
          }
        });
        continue;
      }

      if (w + atomWidth > width && current.length) flush();
      if (atom.type === 'space' && !current.length) continue;
      current.push(atom);
      w += atomWidth;
    }
    flush();
  }
  return out;
}

/** Parse markup first, then wrap. */
export function wrapMarkup(lines, width) {
  return wrapSegments(lines.map(parseMarkup), width).map(renderSegments);
}

/** Remove the shared leading indentation from an ASCII block. */
export const dedent = (art) => {
  const lines = art.split('\n');
  const indent = Math.min(
    ...lines.filter((l) => l.trim()).map((l) => l.match(/^ */)[0].length),
  );
  return lines.map((l) => l.slice(indent)).join('\n');
};

/**
 * Draw a rounded box around segment rows.
 * Rows may be unstyled strings or `{ text, style }` segments.
 */
export function box(rows) {
  const b = { tl: '╭', tr: '╮', bl: '╰', br: '╯', h: '─', v: '│' };
  const styled = rows.map((row) => (typeof row === 'string' ? [{ text: row }] : row));
  const rendered = styled.map((row) => renderSegments(row));
  const inner = Math.max(0, ...rendered.map(visibleWidth)) + 1;
  const horizontal = dim(b.h.repeat(inner));
  const body = rendered.map((l) => `${dim(b.v)} ${padEnd(l, inner - 1)} ${dim(b.v)}`);
  return [
    dim(b.tl) + horizontal + dim(b.tr),
    ...body,
    dim(b.bl) + horizontal + dim(b.br),
  ].join('\n');
}

/**
 * Terminal width to lay out for.
 * An interactive terminal knows its own width; when piped (CI, files) we fall
 * back to COLUMNS so the layout stays predictable and testable.
 */
export function terminalWidth(stream = process.stdout) {
  return stream.columns || Number(process.env.COLUMNS) || 80;
}

/**
 * The static part: ASCII portrait on the left, bio card on the right.
 *
 * Layout is decided by available width:
 *   wide   — portrait beside the card
 *   narrow — portrait above the card
 *   tiny   — no portrait, no box, just wrapped text
 */
export function renderCard(p = profile, columns = terminalWidth()) {
  const art = dedent(p.ascii).split('\n');
  const artWidth = Math.max(...art.map(visibleWidth));
  const GUTTER = 2;
  const CHROME = 4; // "│ " on both sides of the box
  const MAX_BOX = 62;
  const READABLE = 34; // narrowest card that still looks like a card

  const colorize = (line, i) =>
    rgb(...mix(ACCENT, ACCENT_END, art.length === 1 ? 0 : i / (art.length - 1)))(
      line,
    );

  const head = [
    [
      { text: p.name, style: 'name' },
      p.pronouns ? { text: ` (${p.pronouns})`, style: 'dim' } : null,
      p.handle ? { text: '  ' + p.handle, style: 'dim' } : null,
    ].filter(Boolean),
    [
      { text: p.title, style: 'role' },
      p.location ? { text: '  ·  ' + p.location, style: 'location' } : null,
    ].filter(Boolean),
    [],
  ];

  // Tiny terminal: drop the decoration entirely rather than overflow.
  if (columns - CHROME < 16) {
    return wrapSegments(head.concat(p.intro.map(parseMarkup)), columns)
      .map(renderSegments)
      .join('\n');
  }

  // A portrait wider than the terminal would overflow, so drop it entirely.
  const showArt = artWidth <= columns;

  const sideBySide = showArt && columns - artWidth - GUTTER - CHROME >= READABLE;
  const boxWidth = sideBySide
    ? Math.min(MAX_BOX, columns - artWidth - GUTTER)
    : columns;

  const body = wrapSegments(head.concat(p.intro.map(parseMarkup)), boxWidth - CHROME);
  const bio = box(body);
  const bioLines = bio.split('\n');

  if (!sideBySide) {
    return [...(showArt ? art.map((line, i) => colorize(line, i)) : []), '', bio].join('\n');
  }

  const out = [];
  for (let i = 0; i < Math.max(art.length, bioLines.length); i++) {
    const left =
      i < art.length ? padStart(colorize(art[i], i), artWidth) + ' '.repeat(GUTTER) : '';
    out.push(left + (bioLines[i] ?? ''));
  }
  return out.join('\n').replace(/\n+$/, '');
}

/** Short, colourised link list (used by --links and non-TTY runs). */
export function renderLinks(p = profile) {
  const rows = p.menu
    .filter((item) => item.url)
    .map((item) => {
      const label = padEnd(`${item.icon}  ${item.label}`, 26);
      return `    ${label} ${dim(`(${item.hint})`)} ${dim(item.url)}`;
    });
  return [`  ${fgGreen('?')} ${bold('Reach me:')}`, ...rows].join('\n');
}

/** The interactive menu block, without cursor handling. */
export function renderMenu(title, items, active = 0) {
  const rows = items.map((item, i) => {
    const selected = i === active;
    const cursor = selected ? fgGreen('❯') : ' ';
    const icon = item.icon || '•';
    const hint = item.hint ? `  (${item.hint})` : '';
    const label = selected
      ? fgGreen(bold(item.label)) + fgBlue(hint)
      : dim(item.label + hint);
    return `  ${cursor} ${icon}  ${padEnd(label, 26)}`.trimEnd();
  });
  return [`  ${fgGreen('?')} ${bold(title)}`, ...rows].join('\n');
}