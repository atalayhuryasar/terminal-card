# Contributing

Thanks for taking a look. Bug reports, ideas and pull requests are all
welcome.

## Getting set up

```bash
git clone https://github.com/atalayhuryasar/terminal-card.git
cd terminal-card
npm test
node bin/card.js
```

There is nothing to install — the project has no runtime dependencies and no
build step. Node 18 or newer is required.

## Running your own card while hacking

`me.config.js` is the live card. Edit it and run `node bin/card.js` to see
your changes immediately. To check the fallback rendering too, temporarily
point `src/profile.js` at `defaultProfile`.

## Working on the photo converter

The ASCII art generator lives in `scripts/` and is not part of the published
package. It is where a new image format or a new character ramp would go:

```
scripts/ascii-art.js   the command line
scripts/lib/png.js     PNG decode/encode on Node's zlib
scripts/lib/image.js   format detection and transcoding
scripts/lib/ascii.js   resampling, cropping, ramps, rendering
```

Try it against a public avatar while you work:

```bash
npm run ascii -- --github atalayhuryasar --width 40 --rows 30
```

Two rules keep it honest: it must keep working with **zero npm dependencies**,
and it must never send a local file anywhere. `--github` is the only path that
makes a network request, and it only asks GitHub for a public avatar.

## Pull requests

1. Open an issue first for anything larger than a small fix, so we can agree
   on the approach before you write the code.
2. Keep the pull request focused on one change.
3. Add or update tests for behaviour you change.
4. Make sure `npm test` passes.
5. Describe what you changed and why in the PR body.

## Style

There is no linter or formatter config in this project, and that is
deliberate — the codebase is small enough to read in one sitting. Please
match the surrounding code:

- ES modules, no TypeScript, no build step.
- `const` by default, `let` only when a value is reassigned.
- Single quotes, semicolons, two-space indent, trailing commas in
  multi-line literals.
- Comments explain *why*, not *what*.

Keep dependencies at zero. A pull request that adds one needs to explain why
it is worth it.

## Reporting bugs

Open an issue with:

- your OS and Node version (`node -v`),
- the terminal or emulator,
- what you expected and what happened instead,
- the output of `npx huryasar --json` if the card renders wrong.

## Code of conduct

Participation in this project is governed by the
[Code of Conduct](CODE_OF_CONDUCT.md).