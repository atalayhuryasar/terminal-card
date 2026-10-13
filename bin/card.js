#!/usr/bin/env node
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { profile } from '../src/profile.js';
import { renderCard, renderLinks } from '../src/render.js';
import { browse } from '../src/menu.js';
import { bold, dim, fgGreen } from '../src/ansi.js';

const pkg = JSON.parse(
  readFileSync(new URL('../package.json', import.meta.url), 'utf8'),
);

const args = process.argv.slice(2);
const has = (...flags) => flags.some((f) => args.includes(f));
const valueOf = (flag) => {
  const i = args.indexOf(flag);
  return i !== -1 ? args[i + 1] : undefined;
};

const HELP = `
  ${bold(pkg.name)} ${dim('v' + pkg.version)} — ${dim('terminal business card')}

  ${dim('Usage')}   npx ${pkg.name} [options]

  ${dim('Options')}
    --links        Print the link list only, no interactive menu
    --no-menu      Print the card and exit (alias of --links without links)
    --json         Print the profile as JSON
    --help, -h     Show this help
    --version, -v  Show the version

  ${dim('Keys')}    ↑/↓ or j/k to move · 1-9 to jump · enter to open · esc to quit

  ${dim('Repo')}    ${pkg.homepage}
`;

if (has('--help', '-h')) {
  process.stdout.write(HELP);
  process.exit(0);
}

if (has('--version', '-v')) {
  process.stdout.write(pkg.version + '\n');
  process.exit(0);
}

if (has('--json')) {
  process.stdout.write(JSON.stringify(profile, null, 2) + '\n');
  process.exit(0);
}

const header = () => {
  const now = new Date();
  const clock = now.toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
  return `${dim(`Last login: ${now.toDateString()} on ttys000`)}\n${dim(
    '..................................................',
  )}  ${dim('at')} ${dim(clock)}\n`;
};

if (has('--links')) {
  process.stdout.write('\n' + renderCard() + '\n\n' + renderLinks() + '\n');
  process.exit(0);
}

if (has('--no-menu')) {
  process.stdout.write('\n' + renderCard() + '\n');
  process.exit(0);
}

process.stdout.write('\n' + header());
process.stdout.write(renderCard() + '\n');

const items = [...profile.menu, profile.exit];

await browse({
  title: 'Do you want to learn more about me?',
  items,
  onSelect: (item) => {
    if (item.label === profile.exit.label) return;
    process.stdout.write(dim(`\n  ${fgGreen('✦')} Opening ${item.url}\n`));
  },
});

process.stdout.write(dim('  Bye.\n\n'));