<div align="center">

# terminal-card

### Your terminal business card. One command, zero install.

[![npm](https://img.shields.io/npm/v/huryasar?label=npm&color=cb3837&logo=npm)](https://www.npmjs.com/package/huryasar)
[![license](https://img.shields.io/badge/license-MIT-5b8def)](LICENSE)
[![node](https://img.shields.io/badge/node-%3E%3D18-5b8def)](https://nodejs.org)
[![ci](https://github.com/atalayhuryasar/terminal-card/actions/workflows/ci.yml/badge.svg)](https://github.com/atalayhuryasar/terminal-card/actions/workflows/ci.yml)
[![deps](https://img.shields.io/badge/dependencies-0-28a745)](package.json)
[![size](https://img.shields.io/badge/published-14%20kB-5b8def)](https://www.npmjs.com/package/huryasar)

<img src="https://raw.githubusercontent.com/atalayhuryasar/terminal-card/main/docs/card.svg" alt="The card printed by npx huryasar" width="696">

```bash
npx huryasar
```

╭────────────────────────────────────────────────────────────────────╮
│     Atalay Hüryaşar                                                │
│     @atalayhuryasar                                                │
│     Creative Technologist  ·  Somewhere in Asia                    │
│                                                                    │
│     ────────────────                                               │
│     Hello, this is Atalay Hüryaşar, a Creative Technologist.       │
│                                                                    │
│     I build small, sharp tools for people who live in a            │
│     terminal and a menu bar at the same time: Homebrew taps,       │
│     macOS utilities, GitHub Actions, and the occasional Go         │
│     program.                                                       │
│                                                                    │
│     I believe the best software installs with one line and         │
│     then gets out of the way. I am currently shipping open         │
│     source macOS tools and writing about the parts that bite.      │
│                                                                    │
│     Say hi, I do not bite.                                         │
╰────────────────────────────────────────────────────────────────────╯

```

No install, no config, no account. It is 14 kB of JavaScript with **zero
dependencies**, and it makes **no network requests** — the only thing that ever
opens is the link you pick.

<br>

## Try it

```bash
npx huryasar              # the interactive card
```

```
  ? Do you want to learn more about me?
  ❯ 🐙  My GitHub profile  (GitHub)
    🧰  Tools I maintain  (GitHub)
    ✉️  Send me an email  (mail)
    🌐  My website  (Web)
    ⭐  Star this project  (GitHub)
    👋  Bye.
```

| Flag              | Effect                                      |
| ----------------- | ------------------------------------------- |
| `--links`         | Card plus link list, no interactive menu    |
| `--no-menu`       | Card only                                   |
| `--json`          | The resolved profile as JSON                |
| `--help`, `-h`    | Help                                        |
| `--version`, `-v` | Version                                     |

Install it if you would rather have it on your `PATH`:

```bash
npm install -g huryasar
huryasar
```

<br>

## Make it yours

**1 — Fork this repository**

**2 — Edit [`me.config.js`](me.config.js).** That is the only file you need to
touch. A complete card is this short:

```js
export const profile = {
  name: 'Ada Lovelace',
  title: 'Mathematician',
  menu: [
    { icon: '🐙', label: 'My GitHub', hint: 'GitHub', url: 'https://github.com/adalovelace' },
  ],
};
```

Anything you leave out falls back to [`src/default.js`](src/default.js), so you
only write the parts that are actually yours.

**3 — Rename the package** in `package.json`:

```diff
-  "name": "huryasar",
+  "name": "ada",
   "bin": {
-    "huryasar": "bin/card.js"
+    "ada": "bin/card.js"
   },
```

**4 — Publish**

```bash
npm test        # 43 tests, no dependencies
npm publish
```

Your friends now run `npx ada`.

> npm package names cannot be changed after publishing. Check yours is free
> first with `npm view <name>` — an empty result means it is available.

<br>

## The web editor

<p align="center">
  <a href="https://atalayhuryasar.github.io/terminal-card/">
    <img src="https://raw.githubusercontent.com/atalayhuryasar/terminal-card/main/docs/editor.svg" alt="The web editor" width="880">
  </a>
</p>

Fill in the form on the right and the card updates as you type. The preview is
the **real renderer** — `src/render.js` is loaded straight from this
repository — so what you see is what `npx` will print.

Drag the width slider from 24 to 120 columns to watch it reflow, or turn
colour off to see the plain layout.

Press **Download package** and you get a zip containing a finished npm
package: the runtime files, a `me.config.js` with your details, a generated
`package.json`, and a README. Unzip it and the only thing left is:

```bash
npm publish
```

If you prefer code, the **me.config.js** tab edits the same file directly and
reports syntax errors as you type.

Nothing is uploaded. The config is evaluated in your own browser, the preview
is computed on your machine, and the zip is built there too.

---

## Configuration

Everything the card prints lives in `me.config.js`.

| Key        | Type       | Required | Notes                                      |
| ---------- | ---------- | -------- | ------------------------------------------ |
| `name`     | `string`   | yes      | Printed in bold at the top                 |
| `title`    | `string`   | yes      | Your role, shown under the name            |
| `handle`   | `string`   | no       | `@you`, printed next to the name           |
| `location` | `string`   | no       | Shown next to the title                    |
| `pronouns` | `string`   | no       | e.g. `"he/him"`                            |
| `intro`    | `string[]` | no       | Paragraphs; `''` for a blank line          |
| `menu`     | `object[]` | no       | `{ icon, label, hint, url }`               |
| `exit`     | `object`   | no       | The last row of the menu                   |

### Inline markup

Works anywhere in `intro`:

| Syntax          | Result                                    |
| --------------- | ----------------------------------------- |
| `*text*`        | Bold, accent colour                       |
| `` `text` ``    | Bold, highlight colour                    |
| `_text_`        | Dim                                       |
| `{label\|url}`  | Link — opens from the menu                |

```js
intro: [
  'Hello, this is *Ada Lovelace*, a `mathematician`.',
  'I write about {analytical engines|https://example.com/engines}.',
]
```

## It fits your terminal

The card measures your terminal and re-wraps itself to fit. Past 70 columns it
stops growing and centres in the space it is given; below about 20 it drops
the frame entirely and just prints the words.

<img src="https://raw.githubusercontent.com/atalayhuryasar/terminal-card/main/docs/card-narrow.svg" alt="The same card at 52 columns" width="438">

Words that cannot fit — a long URL, a long handle — are broken rather than
allowed to overflow. The test suite checks every width from 6 to 200 columns
against three profiles, including a deliberately hostile one.

<br>

## Keyboard

| Key                 | Action               |
| ------------------- | -------------------- |
| `↑` `↓` or `j` `k`  | Move                 |
| `1`–`9`             | Jump to an entry     |
| `enter`             | Open in your browser |
| `g` / `G`           | First / last entry   |
| `esc`, `q`          | Quit                 |

<br>

## How it behaves

**Nothing is hidden.**

| | |
| --- | --- |
| **Dependencies** | None. Nothing else is installed. |
| **Network** | None. The card never calls home. |
| **Piped output** | Colours are dropped and the menu is skipped automatically. |
| **Environment** | Honours `NO_COLOR`, `FORCE_COLOR`, `TERM=dumb` and `COLUMNS`. |
| **Printing without opening** | `ATALAY_NO_OPEN=1` prints the URL instead of launching a browser. |

> Do **not** run unreviewed config files. `open()` hands the selected URL to
> your platform's default handler — only run configs you trust.

<br>

## Project layout

```
bin/card.js           CLI entry point and flag parsing
me.config.js          your card — the one file you edit
src/profile.js        merges your config over the defaults
src/default.js        fallback profile, also the template reference
src/render.js         markup, word wrapping, the card layout
src/menu.js           arrow-key menu and key decoding
src/ansi.js           colour and display-width helpers
src/open.js           cross-platform "open this link"
web/index.html       the editor
web/app.js           preview, download, the ZIP writer
web/config.js        reads and writes me.config.js
scripts/demo.js       renders docs/*.svg from the real output
test/                 43 tests, no test framework dependency
```

Small enough to read in one sitting, dependency-free enough to trust, tested
enough to fork.

<br>

## Contributing

Issues and pull requests are welcome — see [CONTRIBUTING.md](CONTRIBUTING.md).

```bash
npm test                  # 43 tests
node test/width-check.js  # overflow guard
npm run demo              # regenerate docs/*.svg after changing the card
git diff --exit-code docs # fails if the demo images are stale
```

The demo images in this README are generated from the real output, and a test
fails if they drift out of date.

Security issues: see [SECURITY.md](SECURITY.md). Code of conduct:
[CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md).

<br>

## License

MIT © Atalay Hüryaşar — see [LICENSE](LICENSE).