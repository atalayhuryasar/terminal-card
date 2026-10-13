import { renderMenu, renderLinks } from './render.js';
import { open } from './open.js';

const ESC = '\u001b';
const hideCursor = () => process.stdout.write(`${ESC}[?25l`);
const showCursor = () => process.stdout.write(`${ESC}[?25h`);
const up = (n) => process.stdout.write(`${ESC}[${n}A`);
const clearToEnd = () => process.stdout.write(`${ESC}[0J`);

/**
 * Split a raw stdin chunk into individual key tokens.
 * Terminals sometimes deliver several key presses in one chunk
 * (fast typing, pasted input), and escape sequences must stay intact.
 */
export function* tokenize(chunk) {
  let i = 0;
  while (i < chunk.length) {
    // Read whole code points: indexing by UTF-16 unit would split emoji.
    const ch = String.fromCodePoint(chunk.codePointAt(i));
    if (ch === ESC) {
      const match = /^\u001b(\[[0-9;]*[a-zA-Z~]|O[A-Za-z])/.exec(chunk.slice(i));
      if (match) {
        yield match[0];
        i += match[0].length;
        continue;
      }
      yield ESC;
      i += 1;
      continue;
    }
    yield ch;
    i += ch.length;
  }
}

const KEY = {
  up: `${ESC}[A`,
  down: `${ESC}[B`,
  pageUp: `${ESC}[5~`,
  pageDown: `${ESC}[6~`,
  home: `${ESC}[H`,
  end: `${ESC}[F`,
};

/**
 * Arrow-key menu.
 * Falls back to a plain link list when stdin/stdout is not a TTY (pipes, CI).
 */
export async function browse({ title, items, onSelect }) {
  if (!process.stdin.isTTY || !process.stdout.isTTY) {
    process.stdout.write('\n' + renderLinks() + '\n');
    return null;
  }

  return new Promise((resolve) => {
    let active = 0;
    let done = false;
    let rendered = 0;

    const draw = () => {
      if (rendered > 0) {
        up(rendered);
        clearToEnd();
      }
      const frame = renderMenu(title, items, active);
      process.stdout.write('\n' + frame + '\n');
      rendered = frame.split('\n').length + 1;
    };

    const finish = (value) => {
      if (done) return true;
      done = true;
      process.stdin.removeListener('data', onData);
      if (process.stdin.isTTY) process.stdin.setRawMode(false);
      process.stdin.pause();
      showCursor();
      resolve(value);
      return false;
    };

    const confirm = () => {
      const item = items[active];
      finish(item);
      if (item?.url) {
        if (process.env.ATALAY_NO_OPEN) {
          process.stdout.write(`  ${item.label} → ${item.url}\n`);
        } else {
          open(item.url);
          process.stdout.write(
            `  Opened ${item.label} — ${item.url}\n  (tip: ⌥/Alt-click the link above to copy it)\n`,
          );
        }
        onSelect?.(item);
      } else {
        process.stdout.write('\n');
      }
      return true;
    };

    const move = (delta) => {
      active = (active + delta + items.length) % items.length;
      draw();
    };

    const handleKey = (key) => {
      switch (key) {
        case KEY.up:
        case 'k':
        case 'K':
          return move(-1);
        case KEY.down:
        case 'j':
        case 'J':
          return move(1);
        case KEY.pageDown:
          return move(1);
        case KEY.pageUp:
          return move(-1);
        case KEY.home:
        case 'g':
        case 'G':
          active = 0;
          return draw();
        case KEY.end:
          active = items.length - 1;
          return draw();
        case '\r':
        case '\n':
          return confirm();
        case ESC:
        case 'q':
        case '\x03':
          finish(null);
          process.stdout.write('\n');
          return true;
        default:
          if (key >= '1' && key <= '9') {
            const i = Number(key) - 1;
            if (i < items.length) {
              active = i;
              draw();
              return confirm();
            }
          }
          return false; // keep reading
      }
    };

    const onData = (chunk) => {
      for (const key of tokenize(chunk)) {
        if (handleKey(key)) break;
      }
    };

    const onExit = () => showCursor();

    hideCursor();
    draw();
    process.stdin.setRawMode(true);
    process.stdin.resume();
    process.stdin.setEncoding('utf8');
    process.stdin.on('data', onData);
    process.once('exit', onExit);
  });
}