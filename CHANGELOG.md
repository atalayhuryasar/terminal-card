# Changelog

All notable changes to this project are documented here.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- **Web editor.** Design your card in the browser and download a finished npm
  package, so the only step left is `npm publish`. The preview runs the real
  renderer — `src/render.js` is loaded straight from the repository — and the
  zip is built in the browser by a small ZIP writer, no dependencies. See
  `.github/workflows/pages.yml` for the GitHub Pages deploy.
- `parseRuns()` in `src/ansi.js`: turns a line of ANSI into styled runs. The
  README illustrations and the web preview both use it, so they cannot show
  something a terminal would not.
- `docs/editor.svg`, generated like the other illustrations.
- Typographic card: gradient frame, gradient name, and a fading accent rule
  under the header.

### Changed

- `colorEnabled` and `truecolor` are functions now, and `setColor()` /
  `setTruecolor()` let a host override them — which is what lets the same code
  render in a terminal and in a browser.

### Removed

- The photo-to-ASCII converter (`scripts/ascii-art.js` and `scripts/lib/`).
  Photo renders were hard to make legible at card sizes, and the card reads
  better without a portrait.
- The `ascii` profile key. Draw art into `intro` instead — it is plain text
  and gets the same markup.

### Changed

- The card no longer reserves a column for a portrait, which means it no
  longer has to drop art that is too wide or stack a second layout.
- Below about 20 columns the frame is dropped and the words are printed plain.

## [1.2.0]

### Added

- `scripts/demo.js` renders the card to `docs/*.svg` for the README, straight
  from the real output. Regenerate with `npm run demo`.
- A test fails if the demo images drift out of date, so the README can never
  show something the CLI does not print.
- Discussions enabled on the repository.

### Changed

- Rewrote the README around what a visitor needs: the card first, then why it
  exists, then how to make their own.
- Replaced the fake `Last login: … on ttys000` banner with the real command
  and timestamp.
- Removed dead code and tightened `--help`.

## [1.1.0]

### Added

- `me.config.js`: the card is now a single editable config file, with
  `src/default.js` filling in anything a config omits.
- `terminalWidth()` honours `COLUMNS` when output is piped, so the layout is
  predictable in CI and when writing output to a file.
- Overflow guard (`test/width-check.js`) used by CI.

### Fixed

- Long words and URLs are broken instead of overflowing the card.
- The header now wraps with the body, so a long title or handle no longer
  widens the box past the terminal.
- Key decoding handles batched input and multi-byte characters.
- `npm test` no longer depends on a Node-version-specific test argument.

## [1.0.0]

### Added

- Terminal card: ASCII portrait, bio panel and interactive link menu.
- `me.config.js` so anyone can fork the project and publish their own card
  without touching the rendering code.
- Responsive layout — the card re-wraps to the terminal width and stacks on
  narrow terminals.
- Correct display-width measurement for emoji and ANSI sequences, so menu
  columns stay aligned.
- Flags: `--links`, `--no-menu`, `--json`, `--help`, `--version`.
- Non-TTY support: piping and CI output the plain card and skip the menu.
- Respect for `NO_COLOR`, `FORCE_COLOR`, `TERM=dumb` and `ATALAY_NO_OPEN`.
- Test suite covering markup parsing, wrapping, layout width and key decoding.

[Unreleased]: https://github.com/atalayhuryasar/terminal-card/compare/v1.2.0...HEAD
[1.2.0]: https://github.com/atalayhuryasar/terminal-card/compare/v1.1.0...v1.2.0
[1.1.0]: https://github.com/atalayhuryasar/terminal-card/compare/v1.0.0...v1.1.0
[1.0.0]: https://github.com/atalayhuryasar/terminal-card/releases/tag/v1.0.0