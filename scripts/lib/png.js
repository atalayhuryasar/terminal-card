/**
 * Minimal PNG decoder and encoder built on Node's own zlib.
 * No dependencies, no native code.
 *
 * Supports colour types 0 (grey), 2 (RGB), 3 (palette), 4 (grey+alpha) and
 * 6 (RGBA) at bit depths 1, 2, 4, 8 and 16. Interlaced images are rejected:
 * they are rare in the wild, and `sips` / ImageMagick can convert them.
 */
import { inflateSync, deflateSync } from 'node:zlib';

const SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const CRC_TABLE = (() => {
  const table = new Int32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c;
  }
  return table;
})();

const crc32 = (buf) => {
  let c = -1;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ -1) >>> 0;
};

const CHANNELS = { 0: 1, 2: 3, 3: 1, 4: 2, 6: 4 };

/**
 * @param {Buffer} buffer raw PNG bytes
 * @returns {{width:number, height:number, data:Buffer}} data is RGBA, 4 bytes/pixel
 */
export function decodePng(buffer) {
  if (!buffer.subarray(0, 8).equals(SIGNATURE)) {
    throw new Error('Not a PNG file');
  }

  let header = null;
  let palette = null;
  let transparency = null;
  const idat = [];

  let offset = 8;
  while (offset < buffer.length) {
    const length = buffer.readUInt32BE(offset);
    const type = buffer.toString('ascii', offset + 4, offset + 8);
    const body = buffer.subarray(offset + 8, offset + 8 + length);

    if (type === 'IHDR') {
      header = {
        width: body.readUInt32BE(0),
        height: body.readUInt32BE(4),
        depth: body[8],
        colorType: body[9],
        compression: body[10],
        filter: body[11],
        interlace: body[12],
      };
    } else if (type === 'PLTE') palette = Buffer.from(body);
    else if (type === 'tRNS') transparency = Buffer.from(body);
    else if (type === 'IDAT') idat.push(Buffer.from(body));
    else if (type === 'IEND') break;

    offset += 12 + length;
  }

  if (!header) throw new Error('PNG has no IHDR chunk');
  if (header.interlace) {
    throw new Error('Interlaced PNG is not supported — convert it with `sips` first');
  }
  if (!(header.colorType in CHANNELS)) {
    throw new Error(`Unsupported PNG colour type ${header.colorType}`);
  }

  const { width, height, depth, colorType } = header;
  const channels = CHANNELS[colorType];
  const raw = inflateSync(Buffer.concat(idat));
  const bitsPerPixel = channels * depth;
  const bytesPerPixel = Math.max(1, bitsPerPixel >> 3);
  const stride = Math.ceil((width * bitsPerPixel) / 8);

  // Undo the per-scanline filters.
  const lines = Buffer.alloc(height * stride);
  for (let y = 0; y < height; y++) {
    const filter = raw[y * (stride + 1)];
    const src = raw.subarray(y * (stride + 1) + 1, y * (stride + 1) + 1 + stride);
    const out = lines.subarray(y * stride, (y + 1) * stride);
    const prev = y > 0 ? lines.subarray((y - 1) * stride, y * stride) : null;

    for (let x = 0; x < stride; x++) {
      const a = x >= bytesPerPixel ? out[x - bytesPerPixel] : 0;
      const b = prev ? prev[x] : 0;
      const c = prev && x >= bytesPerPixel ? prev[x - bytesPerPixel] : 0;
      const v = src[x];
      switch (filter) {
        case 0: out[x] = v; break;
        case 1: out[x] = (v + a) & 0xff; break;
        case 2: out[x] = (v + b) & 0xff; break;
        case 3: out[x] = (v + ((a + b) >> 1)) & 0xff; break;
        case 4: out[x] = (v + paeth(a, b, c)) & 0xff; break;
        default: throw new Error(`Unknown PNG filter ${filter}`);
      }
    }
  }

  // Expand to 8 bits per sample, then to RGBA.
  const out = Buffer.alloc(width * height * 4);
  const sample = (line, index) => {
    if (depth === 8) return line[index];
    if (depth === 16) return line[index * 2];
    const perByte = 8 / depth;
    const byte = line[Math.floor(index / perByte)];
    const shift = 8 - depth - (index % perByte) * depth;
    return (byte >> shift) & ((1 << depth) - 1);
  };
  const scale = (v) => (depth >= 8 ? v : Math.round((v * 255) / ((1 << depth) - 1)));

  for (let y = 0; y < height; y++) {
    const line = lines.subarray(y * stride, (y + 1) * stride);
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      const base = x * channels;

      if (colorType === 3) {
        const index = sample(line, base);
        out[i] = palette[index * 3];
        out[i + 1] = palette[index * 3 + 1];
        out[i + 2] = palette[index * 3 + 2];
        out[i + 3] = transparency?.[index] ?? 255;
        continue;
      }

      const [r, g, b, a] =
        colorType === 0 || colorType === 4
          ? [sample(line, base), sample(line, base), sample(line, base),
             colorType === 4 ? sample(line, base + 1) : 255]
          : [sample(line, base), sample(line, base + 1), sample(line, base + 2),
             colorType === 6 ? sample(line, base + 3) : 255];

      out[i] = scale(r);
      out[i + 1] = scale(g);
      out[i + 2] = scale(b);
      out[i + 3] = scale(a);
    }
  }

  return { width, height, data: out };
}

const paeth = (a, b, c) => {
  const p = a + b - c;
  const pa = Math.abs(p - a);
  const pb = Math.abs(p - b);
  const pc = Math.abs(p - c);
  if (pa <= pb && pa <= pc) return a;
  return pb <= pc ? b : c;
};

/** Encode RGBA pixels as a PNG. Used for fixtures and for writing previews. */
export function encodePng({ width, height, data }) {
  const stride = width * 4;
  const raw = Buffer.alloc(height * (stride + 1));
  for (let y = 0; y < height; y++) {
    raw[y * (stride + 1)] = 0; // filter: none
    data.copy(raw, y * (stride + 1) + 1, y * stride, (y + 1) * stride);
  }

  const chunk = (type, body) => {
    const out = Buffer.alloc(12 + body.length);
    out.writeUInt32BE(body.length, 0);
    out.write(type, 4, 'ascii');
    body.copy(out, 8);
    out.writeUInt32BE(crc32(out.subarray(4, 8 + body.length)), 8 + body.length);
    return out;
  };

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // RGBA
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  return Buffer.concat([
    SIGNATURE,
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}