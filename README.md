<div align="center">

# terminal-card

**Your terminal business card. One command, zero install.**

[![npm](https://img.shields.io/npm/v/huryasar?label=npm&color=cb3837&logo=npm)](https://www.npmjs.com/package/huryasar)
[![license](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![node](https://img.shields.io/badge/node-%3E%3D18-brightgreen.svg)](https://nodejs.org)
[![ci](https://github.com/atalayhuryasar/terminal-card/actions/workflows/ci.yml/badge.svg)](https://github.com/atalayhuryasar/terminal-card/actions/workflows/ci.yml)
[![zero deps](https://img.shields.io/badge/dependencies-0-success.svg)](package.json)

</div>

---

This is a live card printed by [`npx huryasar`](https://www.npmjs.com/package/huryasar):

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
    ⭐  Star this project  (GitHub)
    👋  Bye.
```

**This repository is the template.** `huryasar` on npm is one published instance
of it — fork it, edit one file, publish your own.

---

## Quick start

```bash
npx huryasar
```

Nothing to install, nothing to uninstall. If you want it permanently:

```bash
npm install -g huryasar
huryasar
```

## Make it yours

**1. Fork this repository**

**2. Edit [`me.config.js`](me.config.js)** — this is the only file you need.
A minimal config is two lines:

```js
export const profile = {
  name: 'Ada Lovelace',
  menu: [
    { icon: '🐙', label: 'My GitHub', hint: 'GitHub', url: 'https://github.com/adalovelace' },
  ],
};
```

**3. Rename the package** in `package.json` — the `name`, the `bin` key, and
the URLs in `repository` / `bugs` / `homepage`:

```diff
-  "name": "huryasar",
+  "name": "ada",
   "bin": {
-    "huryasar": "bin/card.js"
+    "ada": "bin/card.js"
   },
```

**4. Publish**

```bash
npm test        # make sure it still renders
npm publish
```

That's it. Your friends now run `npx ada`.

> Package names on npm cannot be renamed after publishing. Pick something
> available before you ship. You can check with `npm view <name>`.

## Configuration

Everything the card prints lives in `me.config.js`. Anything you leave out
falls back to [`src/default.js`](src/default.js).

| Key        | Type       | Required | Notes                                          |
| ---------- | ---------- | -------- | ---------------------------------------------- |
| `name`     | `string`   | yes      | Printed in bold at the top                     |
| `title`    | `string`   | yes      | Your role, shown under the name                |
| `handle`   | `string`   | no       | `@you`, printed next to the name               |
| `location` | `string`   | no       | Shown next to the title                        |
| `pronouns` | `string`   | no       | e.g. `"he/him"`                                |
| `ascii`    | `string`   | no       | Any monospace art — the default is a bust      |
| `intro`    | `string[]` | no       | Paragraphs, `''` for a blank line              |
| `menu`     | `object[]` | no       | `{ icon, label, hint, url }`                   |
| `exit`     | `object`   | no       | The last row of the menu                       |

### Inline markup

Works in `intro` lines:

| Syntax        | Result                        |
| ------------- | ----------------------------- |
| `*text*`      | bold, accent colour           |
| `` `text` ``  | bold, highlight colour        |
| `_text_`      | dim                           |
| `{label\|url}`| link — opens in the menu view |

```js
intro: [
  'Hello, this is *Ada Lovelace*, a `mathematician`.',
  'I write about {analytical engines|https://example.com/engines}.',
]
```

### Changing the art

`ascii` is just a string. Any monospace drawing works — block characters,
`░▒▓█▄▀`, emoji, even a word:

```js
ascii: `
  ╭──────────────╮
  │  HELLO       │
  ╰──────────────╯
`,
```

It is dedented automatically, so you do not have to align it with the code.

## CLI flags

| Flag              | Effect                                      |
| ----------------- | ------------------------------------------- |
| `--links`         | Card + link list, no interactive menu       |
| `--no-menu`       | Just the card                               |
| `--json`          | The resolved profile as JSON                |
| `--help`, `-h`    | Help                                        |
| `--version`, `-v` | Version                                     |

## Keyboard

| Key                 | Action                    |
| ------------------- | ------------------------- |
| `↑` `↓` / `j` `k`   | Move                      |
| `1`–`9`             | Jump to an entry          |
| `enter`             | Open in your browser      |
| `g` / `G`           | First / last entry        |
| `esc`, `q`          | Quit                      |

## How it behaves

- **Adapts to your terminal.** The card re-wraps to the current width, and
  falls back to a stacked layout on narrow terminals.
- **Emoji are measured correctly.** `🐙 ✉️ ⭐` count as two columns, so the
  menu stays aligned.
- **Pipes cleanly.** When stdout is not a terminal the colours are dropped and
  the interactive menu is skipped automatically.
- **Respects your environment.** `NO_COLOR`, `FORCE_COLOR`, `TERM=dumb`.
- **Makes no network requests.** Zero dependencies. The only thing that ever
  opens is the link you pick.
- Set `ATALAY_NO_OPEN=1` to print the URL instead of opening a browser.

## Project layout

```
bin/card.js        CLI entry point, flag parsing
src/profile.js     merges me.config.js over the defaults
me.config.js       your card — the file you edit
src/default.js     fallback profile, also the template reference
src/render.js      markup parsing, wrapping, layout
src/menu.js        arrow-key menu and key decoding
src/ansi.js        colour and display-width helpers
src/open.js        cross-platform "open this link"
test/              node:test suite, no dependencies
```

## Contributing

Issues and pull requests are welcome — see
[CONTRIBUTING.md](CONTRIBUTING.md). Run the tests before opening a PR:

```bash
npm test
```

## License

MIT © Atalay Hüryaşar — see [LICENSE](LICENSE).