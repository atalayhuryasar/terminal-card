/**
 * This is the card that `npx huryasar` prints.
 *
 * Fork this project, edit this one file, and publish your own.
 * Only the keys you set are used — everything omitted falls back to
 * `src/default.js`, so a minimal config can be as short as a name and a URL.
 *
 * Markup available in `intro` lines:
 *   *bold accent*   _dim_   `highlight`   {label|url}
 */

export const profile = {
  name: 'Atalay Hüryaşar',
  handle: '@atalayhuryasar',
  title: 'Creative Technologist',
  location: 'Somewhere in Asia',
  pronouns: null,

  ascii: `
  =-..:::==+-=+==#*=-:+@*###+=
  --:---:.:*-===%@#+-:=*#***==
  -::+=:-..++-+-%@**-:==*++#==
  =:-:::--.+===-****--==**=#*=
  -:-.=:--:++#+=*=++=-==##+++=
  :--:=:.::=*==*#*+==-==#*+==-
  -.::.:::.=+=-:..:=*=++#*+=--
  ::::-----+-       .+**#+==--
  ---++---=.         .*#*=----
  =-:=#=:-.           :%#-----
  -.:----.             =#=::--
  -.--.:-              :#-=--:
  ::-:.:                =##-:-
  ::-*.:                -=+-:-
  ::--..                :-:::.
  ..:...                -::::.
  ......       ...      :::...
  :::::.      ..:..     --.:-.
  ::-:-.    .:--==-:    +--=-.
  ::=:..    .-=+**+=:   #+-=-.
  .:-...   .:=*####+=.  -:=+*.
  :::...   :=*#@@@%#+:  -:=+=.
  --::..   -+#@@@@@%#= .-.--.
  =--:::. .=*@@@@@@@@+::-:::..
`
    .replace(/^\n/, '')
    .replace(/\s+$/, ''),

  intro: [
    'Hello, this is *Atalay Hüryaşar*, a `Creative Technologist`.',
    '',
    'I build small, sharp tools for people who live in a terminal and a menu bar at the same time: *Homebrew taps*, *macOS utilities*, *GitHub Actions*, and the occasional *Go* program.',
    '',
    'I believe the best software installs with one line and then gets out of the way. I am currently shipping {open source macOS tools|https://github.com/atalayhuryasar?tab=repositories} and writing about the parts that bite.',
    '',
    '_Say hi, I do not bite._',
  ],

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
      label: 'Star this project',
      hint: 'GitHub',
      url: 'https://github.com/atalayhuryasar/terminal-card',
    },
  ],

  exit: { icon: '👋', label: 'Bye.' },
};

export default profile;