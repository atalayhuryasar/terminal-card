/**
 * Reading and writing me.config.js.
 *
 * The card is a JavaScript file, not JSON, so these two functions are the
 * contract between the web editor and the CLI: what the editor writes must
 * be exactly what `npm publish` ships.
 */

const quote = (value) =>
  `'${String(value ?? '').replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`;

/** Serialise a profile into a me.config.js the CLI can read. */
export function toConfig(profile) {
  const links = (profile.menu ?? [])
    .map(
      (item) => `    {
      icon: ${quote(item.icon)},
      label: ${quote(item.label)},
      hint: ${quote(item.hint)},
      url: ${quote(item.url)},
    },`,
    )
    .join('\n');

  return `/**
 * Your terminal business card.
 *
 * This is the only file you need to edit. Anything you leave out falls
 * back to the template's defaults.
 */

export const profile = {
  name: ${quote(profile.name)},
  handle: ${quote(profile.handle)},
  title: ${quote(profile.title)},
  location: ${quote(profile.location)},
  pronouns: ${profile.pronouns ? quote(profile.pronouns) : 'null'},

  intro: [
${(profile.intro ?? []).map((line) => `    ${quote(line)},`).join('\n')}
  ],

  menu: [
${links}
  ],

  exit: { icon: ${quote(profile.exit?.icon)}, label: ${quote(profile.exit?.label)} },
};

export default profile;
`;
}

/**
 * Read a config back by evaluating it.
 *
 * This runs whatever is in the textarea, in the reader's own browser, on
 * their own machine — the same trust level as them running the file with node.
 */
export function fromConfig(source) {
  const body = source
    .replace(/^\s*export\s+default\s+[\s\S]*?;?\s*$/m, '')
    .replace(/^\s*export\s+(const|let|var)\s+/gm, '$1 ');

  let profile;
  try {
    // eslint-disable-next-line no-new-func
    profile = new Function(`${body}\n; return profile;`)();
  } catch (error) {
    if (/profile is not defined/.test(error.message)) {
      throw new Error('the config does not export a profile object');
    }
    throw error; // a genuine syntax error, with its own useful message
  }

  if (!profile || typeof profile !== 'object') {
    throw new Error('the config does not export a profile object');
  }
  return profile;
}

/** A tiny npm-name check, to save people a publish failure later. */
export function checkPackageName(name) {
  if (!name) return 'Pick a name.';
  if (name.length > 214) return 'Too long — npm allows 214 characters.';
  if (!/^[a-z0-9][a-z0-9-._]*$/.test(name)) {
    return 'Lowercase letters, digits, and - . _ only.';
  }
  return null;
}