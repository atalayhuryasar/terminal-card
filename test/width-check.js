import { visibleWidth } from '../src/ansi.js';
import { renderCard } from '../src/render.js';
import defaultProfile from '../src/default.js';

const widths = [6, 10, 20, 40, 60, 80, 100, 120, 200];
const profiles = { default: defaultProfile };

let failures = 0;

for (const [name, profile] of Object.entries(profiles)) {
  for (const columns of widths) {
    for (const line of renderCard(profile, columns).split('\n')) {
      const width = visibleWidth(line);
      if (width > columns) {
        console.error(
          `overflow: ${name} at ${columns} cols produced a ${width} wide line`,
        );
        failures++;
      }
    }
  }
}

if (failures) {
  console.error(`${failures} overflowing lines`);
  process.exit(1);
}

console.log(`no overflow across ${widths.length} widths`);