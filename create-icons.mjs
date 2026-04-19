/**
 * Generates placeholder icons required by Tauri in src-tauri/icons/
 * Uses only built-in Node.js modules — no dependencies needed.
 * Run once: node create-icons.mjs
 */

import { writeFileSync, mkdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { deflateSync } from "zlib";

const __dirname = dirname(fileURLToPath(import.meta.url));
const iconsDir = join(__dirname, "src-tauri", "icons");
mkdirSync(iconsDir, { recursive: true });

// ── CRC-32 (required by PNG format) ─────────────────────────────────────────
const crcTable = (() => {
  const t = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let j = 0; j < 8; j++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[i] = c;
  }
  return t;
})();

function crc32(buf) {
  let crc = 0xffffffff;
  for (const b of buf) crc = crcTable[(crc ^ b) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

function pngChunk(type, data) {
  const typeBuf = Buffer.from(type, "ascii");
  const lenBuf = Buffer.alloc(4);
  lenBuf.writeUInt32BE(data.length);
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])));
  return Buffer.concat([lenBuf, typeBuf, data, crcBuf]);
}

// ── Create a solid-colour RGB PNG ───────────────────────────────────────────
function makePNG(size, r = 99, g = 102, b = 241) {
  // IHDR
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // colour type: RGB
  // compression / filter / interlace = 0

  // Raw pixel rows: filter byte (0) + RGB pixels
  const raw = Buffer.alloc(size * (1 + size * 3));
  for (let y = 0; y < size; y++) {
    const row = y * (1 + size * 3);
    raw[row] = 0; // filter: None
    for (let x = 0; x < size; x++) {
      const p = row + 1 + x * 3;
      raw[p] = r;
      raw[p + 1] = g;
      raw[p + 2] = b;
    }
  }

  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), // PNG signature
    pngChunk("IHDR", ihdr),
    pngChunk("IDAT", deflateSync(raw)),
    pngChunk("IEND", Buffer.alloc(0)),
  ]);
}

// ── Bundle PNGs into a Windows ICO (PNG-inside-ICO, Vista+) ─────────────────
function makeICO(pngMap) {
  // pngMap: { size: Buffer, ... }
  const entries = Object.entries(pngMap).map(([s, buf]) => ({
    size: Number(s),
    buf,
  }));

  const HEADER = 6;
  const DIR_ENTRY = 16;
  let offset = HEADER + DIR_ENTRY * entries.length;

  const header = Buffer.alloc(HEADER);
  header.writeUInt16LE(0, 0); // reserved
  header.writeUInt16LE(1, 2); // type: ICO
  header.writeUInt16LE(entries.length, 4);

  const dirs = entries.map(({ size, buf }) => {
    const d = Buffer.alloc(DIR_ENTRY);
    d[0] = size >= 256 ? 0 : size; // 0 means 256
    d[1] = size >= 256 ? 0 : size;
    d[2] = 0; // colour count (0 = true colour)
    d[3] = 0; // reserved
    d.writeUInt16LE(1, 4);  // colour planes
    d.writeUInt16LE(32, 6); // bits per pixel
    d.writeUInt32LE(buf.length, 8);
    d.writeUInt32LE(offset, 12);
    offset += buf.length;
    return d;
  });

  return Buffer.concat([header, ...dirs, ...entries.map((e) => e.buf)]);
}

// ── Generate PNGs at all required sizes ─────────────────────────────────────
const sizes = [16, 32, 48, 64, 128, 256];
const pngs = {};
for (const s of sizes) pngs[s] = makePNG(s);

// Required by tauri.conf.json bundle.icon list
writeFileSync(join(iconsDir, "32x32.png"), pngs[32]);
writeFileSync(join(iconsDir, "128x128.png"), pngs[128]);
writeFileSync(join(iconsDir, "128x128@2x.png"), makePNG(256)); // @2x = double res

// Windows ICO (required for tauri-build on Windows)
const ico = makeICO({ 16: pngs[16], 32: pngs[32], 48: pngs[48], 64: pngs[64], 128: pngs[128], 256: pngs[256] });
writeFileSync(join(iconsDir, "icon.ico"), ico);

// macOS ICNS — write a stub PNG; real ICNS only needed for macOS builds
writeFileSync(join(iconsDir, "icon.icns"), pngs[128]);

console.log("✓ Icons created in src-tauri/icons/");
console.log("  32x32.png, 128x128.png, 128x128@2x.png, icon.ico, icon.icns");
console.log("\nNow run: npm run tauri dev");
