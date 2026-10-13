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
import profile from './data.js';

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
 * Parse the mini markup used in data.js into styled segments.
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
 * Word-wrap source lines that contain markup, without losing styling.
 * A word split across several styled segments stays together.
 */
export function wrapMarkup(lines, width) {
  const out = [];

  for (const line of lines) {
    const atoms = [];
    let word = [];

    for (const seg of parseMarkup(line)) {
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
      out.push('');
      continue;
    }

    let row = [];
    let w = 0;
    const flush = () => {
      while (row.length && row.at(-1).type === 'space') row.pop(); // drop trailing space
      if (row.length) out.push(renderSegments(row.flatMap((a) => a.parts)));
      row = [];
      w = 0;
    };

    for (const atom of atoms) {
      const width_ =
        atom.type === 'space'
          ? visibleWidth(atom.parts[0].text)
          : visibleWidth(renderSegments(atom.parts));
      if (w + width_ > width && row.length) flush();
      if (atom.type === 'space' && !row.length) continue;
      row.push(atom);
      w += width_;
    }
    flush();
  }
  return out;
}

/** Remove the shared leading indentation from an ASCII block. */
export const dedent = (art) => {
  const lines = art.split('\n');
  const indent = Math.min(
    ...lines.filter((l) => l.trim()).map((l) => l.match(/^ */)[0].length),
  );
  return lines.map((l) => l.slice(indent)).join('\n');
};

/** Draw a rounded box around already-styled lines. */
export function box(lines, width) {
  const b = { tl: '╭', tr: '╮', bl: '╰', br: '╯', h: '─', v: '│' };
  const inner = Math.max(width || 0, ...lines.map(visibleWidth)) + 1;
  const horizontal = dim(b.h.repeat(inner));
  const body = lines.map((l) => `${dim(b.v)} ${padEnd(l, inner - 1)} ${dim(b.v)}`);
  return [
    dim(b.tl) + horizontal + dim(b.tr),
    ...body,
    dim(b.bl) + horizontal + dim(b.br),
  ].join('\n');
}

/** The static part: ASCII portrait on the left, bio card on the right. */
export function renderCard(p = profile, columns = process.stdout.columns || 80) {
  const art = dedent(p.ascii).split('\n');
  const artWidth = Math.max(...art.map(visibleWidth));
  const GUTTER = 2;
  const CHROME = 4; // │ + space on both sides
  const MAX_BOX = 62;

  const colorize = (line, i) =>
    rgb(...mix(ACCENT, ACCENT_END, art.length === 1 ? 0 : i / (art.length - 1)))(
      line,
    );

  // Side by side if there is room for a readable card, otherwise stack.
  const room = columns - artWidth - GUTTER - CHROME;
  const sideBySide = room >= 34;
  const inner = sideBySide
    ? Math.min(MAX_BOX, room)
    : Math.max(28, columns - CHROME);

  const head = [
    [
      { text: p.name, style: 'name' },
      { text: '  ' + p.handle, style: 'dim' },
    ],
    [
      { text: p.title, style: 'role' },
      { text: '  ·  ' + p.location, style: 'dim' },
    ],
    null,
  ].map((row) =>
    row === null ? '' : renderSegments(row.map(({ text, style }) => ({ text, style }))),
  );

  const body = wrapMarkup(p.intro, inner - 2);
  const bio = box([...head, ...body], inner - 2);
  const bioLines = bio.split('\n');

  if (!sideBySide) {
    return [
      ...art.map((line, i) => colorize(line, i)),
      '',
      bio,
    ].join('\n');
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