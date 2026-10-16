/**
 * A ZIP writer for the browser, so the editor can hand someone a real
 * package without asking them to install anything.
 *
 * Uses CompressionStream when the browser has it, and falls back to storing
 * the files uncompressed. Either way the result is a normal zip that
 * unzip, Finder and Explorer all understand.
 */

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c >>> 0;
  }
  return table;
})();

function crc32(bytes) {
  let c = 0xffffffff;
  for (const byte of bytes) c = CRC_TABLE[(c ^ byte) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

async function deflate(bytes) {
  if (typeof CompressionStream === 'undefined') return { bytes, method: 0 };
  try {
    const stream = new Blob([bytes])
      .stream()
      .pipeThrough(new CompressionStream('deflate-raw'));
    const out = new Uint8Array(await new Response(stream).arrayBuffer());
    return out.length < bytes.length ? { bytes: out, method: 8 } : { bytes, method: 0 };
  } catch {
    return { bytes, method: 0 };
  }
}

/** Build a ZIP archive from `[{ name, text }]`. */
export async function zip(files) {
  const encoder = new TextEncoder();
  const parts = [];
  const central = [];
  let offset = 0;

  for (const file of files) {
    const name = encoder.encode(file.name);
    const raw = encoder.encode(file.text);
    const { bytes, method } = await deflate(raw);

    const header = new Uint8Array(30 + name.length);
    const view = new DataView(header.buffer);
    view.setUint32(0, 0x04034b50, true); // local file header
    view.setUint16(4, 20, true); // version needed
    view.setUint16(8, method, true); // stored or deflated
    view.setUint32(14, crc32(raw), true);
    view.setUint32(18, bytes.length, true);
    view.setUint32(22, raw.length, true);
    view.setUint16(26, name.length, true);
    header.set(name, 30);

    parts.push(header, bytes);
    central.push({ name, crc: crc32(raw), size: bytes.length, raw: raw.length, offset });
    offset += header.length + bytes.length;
  }

  const directory = new Uint8Array(
    central.reduce((sum, f) => sum + 46 + f.name.length, 0),
  );
  const view = new DataView(directory.buffer);
  let cursor = 0;
  for (const f of central) {
    view.setUint32(cursor, 0x02014b50, true); // central directory header
    view.setUint16(cursor + 4, 20, true);
    view.setUint16(cursor + 8, 8, true); // deflate
    view.setUint32(cursor + 16, f.crc, true);
    view.setUint32(cursor + 20, f.size, true);
    view.setUint32(cursor + 24, f.raw, true);
    view.setUint16(cursor + 28, f.name.length, true);
    view.setUint32(cursor + 42, f.offset, true);
    directory.set(f.name, cursor + 46);
    cursor += 46 + f.name.length;
  }

  const end = new Uint8Array(22);
  const endView = new DataView(end.buffer);
  endView.setUint32(0, 0x06054b50, true); // end of central directory
  endView.setUint16(8, central.length, true);
  endView.setUint16(10, central.length, true);
  endView.setUint32(12, directory.length, true);
  endView.setUint32(16, offset, true);

  return new Blob([...parts, directory, end], { type: 'application/zip' });
}

/** Hand the browser a file. */
export function save(blob, filename) {
  const url = URL.createObjectURL(blob);
  const link = Object.assign(document.createElement('a'), { href: url, download: filename });
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}