/**
 * Fallback profile.
 *
 * This is what the card shows when a project has no `me.config.js`.
 * Fork this repository, create your own `me.config.js`, and this file is
 * never used again — it stays here so the project still runs out of the box.
 *
 * @see ../me.config.js for the shape of a real config.
 */

export const defaultProfile = {
  name: 'Your Name',
  handle: '@your-handle',
  title: 'What you do',
  location: 'Where you are',
  pronouns: null,

  ascii: `
     ▄▄▄▄▄▄
   ▄█████████▄▄
  ██████████████
  ██  ▀▀▀▀▀▀  ██
  ██████████████
    ▀███████▀▀
 ▄▄▄▄▀▀▀▀▀▀▀▀▀▄▄▄▄
█████████████████████
 ▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀
  `
    .replace(/^\n/, '')
    .replace(/\s+$/, ''),

  intro: [
    'This card has not been filled in yet.',
    '',
    'Fork this project, copy `src/default.js` to `me.config.js`, and replace the placeholders with your own details. Then `npm publish` and you have your own terminal card.',
  ],

  menu: [
    {
      icon: '🐙',
      label: 'My GitHub profile',
      hint: 'GitHub',
      url: 'https://github.com/your-handle',
    },
  ],

  exit: { icon: '👋', label: 'Bye.' },
};

export default defaultProfile;