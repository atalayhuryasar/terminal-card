# Security Policy

## Supported versions

Only the latest published version receives fixes.

| Version | Supported |
| ------- | --------- |
| 1.x     | yes       |

## Reporting a vulnerability

Please **do not open a public issue** for security problems.

Email **adematalayhuryasar@gmail.com** with a description of the problem, the
version you are on, and the steps to reproduce it. You will get an
acknowledgement within a few days.

Since this package has zero dependencies and makes no network requests, the
attack surface is small — but a clear, private channel is still the right
place for anything that affects users.

## Scope notes

- `open()` shells out to the platform's default handler for links you select
  in the menu. Only open links you trust.
- Card content comes from `me.config.js`, which ships inside the package. If
  you fork this project, review your config before publishing.