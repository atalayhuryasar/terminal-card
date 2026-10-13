/**
 * Everything printed by `npx atalay` lives here.
 * Edit this file, open a PR, or just fork and run it locally.
 */

export const profile = {
  name: 'Atalay Hüryaşar',
  handle: '@atalayhuryasar',
  title: 'Creative Technologist',
  location: 'Somewhere in Asia',
  pronouns: null, // set to a string to display next to the name

  ascii: String.raw`
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

  // Mini markup used by the intro paragraphs (they are re-wrapped to the
  // terminal width at render time, so write them as flowing text):
  //   *text*      -> bold accent
  //   _text_      -> dim
  //   `text`      -> magenta highlight
  //   {text|url}  -> link text, opened on click in the menu view
  intro: [
    'Hello, this is *Atalay Hüryaşar*, a `Creative Technologist`.',
    '',
    'I build small, sharp tools for people who live in a terminal and a menu bar at the same time: *Homebrew taps*, *macOS utilities*, *GitHub Actions*, and the occasional *Go* program.',
    '',
    'I believe the best software installs with one line and then gets out of the way. I am currently shipping {open source macOS tools|https://github.com/atalayhuryasar?tab=repositories} and writing about the parts that bite.',
    '',
    '_Say hi, I do not bite._',
  ],

  stats: [
    ['GitHub', 'github.com/atalayhuryasar'],
    ['Web', 'huryasar.com'],
    ['Mail', 'adematalayhuryasar@gmail.com'],
  ],

  // Items shown in the interactive menu.
  menu: [
    {
      icon: '🐙',
      label: 'My GitHub profile',
      hint: 'GitHub',
      url: 'https://github.com/atalayhuryasar',
    },
    {
      icon: '🧰',
      label: 'Tools I maintain',
      hint: 'GitHub',
      url: 'https://github.com/atalayhuryasar?tab=repositories',
    },
    {
      icon: '✉️',
      label: 'Send me an email',
      hint: 'mail',
      url: 'mailto:adematalayhuryasar@gmail.com',
    },
    {
      icon: '🌐',
      label: 'My website',
      hint: 'Web',
      url: 'https://huryasar.com',
    },
    {
      icon: '⭐',
      label: 'Star this card',
      hint: 'GitHub',
      url: 'https://github.com/atalayhuryasar/atalay',
    },
  ],

  exit: { icon: '👋', label: 'Bye.' },
};

export default profile;