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