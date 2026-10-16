/**
 * Assembling the downloadable package.
 *
 * The runtime files are the same ones the CLI runs — fetched from the site
 * itself — so what somebody downloads is the real thing, not a rebuild.
 */
import { toConfig } from './config.js';

/** The files that make up a publishable package, besides the config. */
export const RUNTIME_FILES = [
  'LICENSE',
  'bin/card.js',
  'src/ansi.js',
  'src/render.js',
  'src/menu.js',
  'src/open.js',
  'src/profile.js',
  'src/default.js',
];

export async function loadRuntime(base = '..') {
  const files = await Promise.all(
    RUNTIME_FILES.map(async (name) => {
      const response = await fetch(`${base}/${name}`);
      if (!response.ok) throw new Error(`could not load ${name} (${response.status})`);
      return { name, text: await response.text() };
    }),
  );
  return files;
}

const manifest = (profile) =>
  `${JSON.stringify(
    {
      name: profile.packageName,
      version: '1.0.0',
      description: `${profile.name}'s terminal business card. Run \`npx ${profile.packageName}\`.`,
      keywords: ['cli', 'card', 'business-card', 'profile', 'terminal'],
      homepage: `https://www.npmjs.com/package/${profile.packageName}`,
      license: 'MIT',
      author: profile.name,
      type: 'module',
      bin: { [profile.packageName]: 'bin/card.js' },
      files: ['bin', 'src', 'me.config.js', 'README.md', 'LICENSE'],
      engines: { node: '>=18' },
    },
    null,
    2,
  )}\n`;

const readme = (profile) => `# ${profile.packageName}

My terminal business card. Run \`npx ${profile.packageName}\`.

Built with [terminal-card](https://github.com/atalayhuryasar/terminal-card).

## License

MIT
`;

const publishGuide = (profile) => `# Publishing

Everything is ready. Two commands:

\`\`\`bash
cd ${profile.packageName}
npm publish
\`\`\`

That is it — people can then run:

\`\`\`bash
npx ${profile.packageName}
\`\`\`

## Notes

- If you have not published before, run \`npm login\` once first.
- \`npm publish\` asks for a one-time 2FA code.
- Check the name is still free: \`npm view ${profile.packageName}\` should
  return nothing.
- Package names cannot be changed after publishing.
- To change something later, edit \`me.config.js\` and \`npm publish\` again.
`;

/** Every file that goes into the zip, in order. */
export function packageFiles(profile, runtime) {
  return [
    { name: 'me.config.js', text: toConfig(profile) },
    { name: 'package.json', text: manifest(profile) },
    { name: 'README.md', text: readme(profile) },
    ...runtime,
    { name: 'PUBLISH.md', text: publishGuide(profile) },
  ];
}