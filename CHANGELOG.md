# Changelog

All notable changes to this project are documented here.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

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

[Unreleased]: https://github.com/atalayhuryasar/terminal-card/compare/v1.0.0...HEAD
[1.0.0]: https://github.com/atalayhuryasar/terminal-card/releases/tag/v1.0.0