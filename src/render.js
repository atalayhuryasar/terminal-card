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
        case 'gradient':
          return bold(gradientText(text));
        case 'handle':
          return fgBlue(text);
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

/**
 * Terminal width to lay out for.
 * An interactive terminal knows its own width; when piped (CI, files) we fall
 * back to COLUMNS so the layout stays predictable and testable.
 */
export function terminalWidth(stream = process.stdout) {
  return stream.columns || Number(process.env.COLUMNS) || 80;
}

/**
 * The card: a typographic panel, no portrait.
 *
 * Colour does the work an image would otherwise do — a gradient frame, a
 * gradient name, an accent rule, dimmed metadata — so the card reads well at
 * any width and nothing has to be drawn by hand.
 *
 *   ╭───────────── gradient frame ─────────────╮
 *   │   Atalay Hüryaşar      (gradient, bold)  │
 *   │   @handle                              │
 *   │   Role  ·  Location                    │
 *   │   ─────── fading rule ───────          │
 *   │   body text, wrapped to the frame      │
 *   ╰─────────────────────────────────────────╯
 */
export function renderCard(p = profile, columns = terminalWidth()) {
  const SIDE = 2; // spaces between the edge and the text
  const PAD = 2; // extra breathing room inside that
  const MAX = 70; // widest the card ever gets
  // two edges, the two corners, and the padding on both sides
  const GUTTER = 2 + 2 * (1 + SIDE + PAD);

  // Never wider than the terminal, however narrow that is.
  const outer = Math.min(MAX, columns);
  const text = outer - GUTTER; // width available for content

  // Too narrow to frame anything: print the words and leave it at that.
  if (text < 12) {
    return wrapSegments(
      [[{ text: p.name, style: 'name' }], [{ text: p.title, style: 'role' }], []]
        .concat(p.intro.map(parseMarkup)),
      columns,
    )
      .map(renderSegments)
      .join('\n');
  }

  const head = [
    [
      { text: p.name, style: 'gradient' },
      p.pronouns ? { text: ` (${p.pronouns})`, style: 'dim' } : null,
    ].filter(Boolean),
    p.handle ? [{ text: p.handle, style: 'handle' }] : [],
    [
      { text: p.title, style: 'role' },
      p.location ? { text: `  ·  ${p.location}`, style: 'dim' } : null,
    ].filter(Boolean),
    [],
  ];

  const body = wrapSegments(head.concat(p.intro.map(parseMarkup)), text);
  body.splice(headerEnd(body), 0, { type: 'rule', width: text });

  const edge = rgb(...ACCENT)('│');
  const inset = ' '.repeat(1 + SIDE + PAD);
  const wrap = (content) => `${edge}${inset}${content}${' '.repeat(PAD + SIDE)} ${edge}`;

  const rows = body.map((row) =>
    row.type === 'rule'
      ? wrap(rule(row.width))
      : wrap(padEnd(renderSegments(row), text)),
  );

  const span = outer - 2; // dashes between the two corners
  return [
    gradientEdge(span, '╭', '╮', ACCENT, ACCENT_END),
    ...rows,
    gradientEdge(span, '╰', '╯', ACCENT_END, ACCENT),
  ].join('\n');
}

/** Index just after the blank row that closes the header block. */
function headerEnd(rows) {
  for (let i = 0; i < rows.length; i++) {
    if (rows[i].length === 0) return i + 1;
  }
  return rows.length;
}

/** Every character in its own colour, stepping across the gradient. */
function gradientText(value, from = ACCENT, to = ACCENT_END) {
  const chars = [...value];
  if (chars.length === 1) return rgb(...from)(chars[0]);
  return chars
    .map((char, i) => rgb(...mix(from, to, i / (chars.length - 1)))(char))
    .join('');
}

/** A run of dashes fading from one colour into another. */
function gradientEdge(width, left, right, from, to) {
  let out = rgb(...from)(left);
  for (let i = 0; i < width; i++) {
    const t = width === 1 ? 0 : i / (width - 1);
    out += rgb(...mix(from, to, t))('─');
  }
  return out + rgb(...to)(right);
}

/** The separator under the header: accent, fading out towards the right. */
function rule(width) {
  const steps = Math.min(width, 16);
  let out = '';
  for (let i = 0; i < steps; i++) {
    const t = steps === 1 ? 0 : i / (steps - 1);
    // Fade towards black as it goes, so the rule stays quiet.
    const color = mix(mix(ACCENT, ACCENT_END, t), [0, 0, 0], 1 - t * 0.5);
    out += rgb(...color)('─');
  }
  return out + ' '.repeat(Math.max(0, width - steps));
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