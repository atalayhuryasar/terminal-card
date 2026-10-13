# atalay

My terminal business card. Run one command, get the card.

```bash
npx atalay
```

```
               ▄▄▄▄▄▄  ╭────────────────────────────────────────────────────╮
         ▄█████████▄▄  │ Atalay Hüryaşar  @atalayhuryasar                    │
       ██████████████  │ Creative Technologist  ·  Somewhere in Asia         │
       ██  ▀▀▀▀▀▀  ██  │                                                     │
       ██████████████  │ Hello, this is Atalay Hüryaşar, a Creative          │
           ▀███████▀▀  │ Technologist.                                       │
    ▄▄▄▄▀▀▀▀▀▀▀▀▀▄▄▄▄  │                                                     │
█████████████████████  │ I build small, sharp tools for people who live in a │
  ▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀  │ terminal and a menu bar at the same time: Homebrew  │
│ taps, macOS utilities, GitHub Actions, and the      │
│ occasional Go program.                              │
│                                                     │
│ I believe the best software installs with one line  │
│ and then gets out of the way. I am currently        │
│ shipping open source macOS tools and writing about  │
│ the parts that bite.                                │
│                                                     │
│ Say hi, I do not bite.                              │
╰────────────────────────────────────────────────────╯

  ? Do you want to learn more about me?
  ❯ 🐙  My GitHub profile  (GitHub)
    🧰  Tools I maintain  (GitHub)
    ✉️  Send me an email  (mail)
    🌐  My website  (Web)
    ⭐  Star this card  (GitHub)
    👋  Bye.
```

## Install

Nothing to install:

```bash
npx atalay
```

Or keep it around:

```bash
npm install -g atalay
atalay
```

## Keys

| Key             | Action                     |
| --------------- | -------------------------- |
| `↑` `↓` / `j` `k` | move                       |
| `1`–`9`         | jump straight to an entry  |
| `enter`         | open it in the browser     |
| `g` / `G`       | first / last entry         |
| `esc`, `q`      | quit                       |

## Flags

| Flag              | What it does                                    |
| ----------------- | ----------------------------------------------- |
| `--links`         | card + link list, no interactive menu           |
| `--no-menu`       | just the card                                   |
| `--json`          | the profile as JSON                             |
| `--help`, `-h`    | help                                            |
| `--version`, `-v` | version                                         |

Piping and CI work fine — when the output is not a terminal the card is
printed without colours and the interactive menu is skipped automatically.

```bash
npx atalay --links > card.txt   # save the plain card to a file
```

## Make it yours

Everything the card prints lives in [`src/data.js`](src/data.js):

```js
export const profile = {
  name: 'Atalay Hüryaşar',
  title: 'Creative Technologist',
  ascii: `...`,
  intro: ['*Markup* is supported: `code`, _dim_, {label|url}.'],
  menu: [{ icon: '🐙', label: 'My GitHub profile', hint: 'GitHub', url: '...' }],
};
```

Then run it locally:

```bash
node bin/atalay.js
```

## Notes

- Zero dependencies. Nothing else is installed, nothing phones home.
- Honours `NO_COLOR`, `FORCE_COLOR`, `TERM=dumb` and the terminal width.
- Set `ATALAY_NO_OPEN=1` to print the URL instead of opening a browser.

## License

MIT