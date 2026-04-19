import { readFileSync, writeFileSync } from "fs";
import { inflateSync, deflateSync } from "zlib";

const src = "C:\\Users\\Loq\\Desktop\\myIcon_cropped.png";
const dst = "C:\\Users\\Loq\\Desktop\\myIcon_square.png";

const buf = readFileSync(src);

// ── Parse PNG ────────────────────────────────────────────────────────────────
function readU32(b, o) { return b.readUInt32BE(o); }

let pos = 8, ihdr, idatChunks = [];
while (pos < buf.length) {
  const len = readU32(buf, pos);
  const type = buf.slice(pos + 4, pos + 8).toString("ascii");
  const data = buf.slice(pos + 8, pos + 8 + len);
  if (type === "IHDR") ihdr = data;
  if (type === "IDAT") idatChunks.push(data);
  pos += 12 + len;
}

const W = readU32(ihdr, 0), H = readU32(ihdr, 4);
const colorType = ihdr[9]; // 6 = RGBA, 2 = RGB
const channels = colorType === 6 ? 4 : 3;
console.log(`Source: ${W}x${H} colorType=${colorType}`);

// Decompress IDAT
const compressed = Buffer.concat(idatChunks);
const raw = inflateSync(compressed);

// Remove PNG filter bytes → get pixel rows
const stride = 1 + W * channels;
function getPixel(x, y) {
  const base = y * stride + 1 + x * channels;
  return { r: raw[base], g: raw[base + 1], b: raw[base + 2], a: channels === 4 ? raw[base + 3] : 255 };
}

// Already cropped — just make square by centering on smaller dimension
const side = Math.min(W, H);
const minX = Math.floor((W - side) / 2);
const minY = Math.floor((H - side) / 2);
console.log(`Source: ${W}x${H} → square ${side}x${side} (offset ${minX},${minY})`);

// ── Build new raw pixel data ─────────────────────────────────────────────────
const newRaw = Buffer.alloc(side * (1 + side * channels));
for (let y = 0; y < side; y++) {
  const srcY = minY + y;
  newRaw[y * (1 + side * channels)] = 0; // filter: None
  for (let x = 0; x < side; x++) {
    const srcX = minX + x;
    const srcBase = srcY * stride + 1 + srcX * channels;
    const dstBase = y * (1 + side * channels) + 1 + x * channels;
    for (let c = 0; c < channels; c++) newRaw[dstBase + c] = raw[srcBase + c];
  }
}

// ── Encode PNG ───────────────────────────────────────────────────────────────
const crcTable = (() => {
  const t = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let j = 0; j < 8; j++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[i] = c;
  }
  return t;
})();

function crc32(b) {
  let crc = 0xffffffff;
  for (const byte of b) crc = crcTable[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const tb = Buffer.from(type, "ascii");
  const lb = Buffer.alloc(4); lb.writeUInt32BE(data.length);
  const cb = Buffer.alloc(4); cb.writeUInt32BE(crc32(Buffer.concat([tb, data])));
  return Buffer.concat([lb, tb, data, cb]);
}

const newIhdr = Buffer.alloc(13);
newIhdr.writeUInt32BE(side, 0); newIhdr.writeUInt32BE(side, 4);
newIhdr[8] = 8; newIhdr[9] = colorType;

writeFileSync(dst, Buffer.concat([
  Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
  chunk("IHDR", newIhdr),
  chunk("IDAT", deflateSync(newRaw)),
  chunk("IEND", Buffer.alloc(0)),
]));

console.log(`Saved: ${dst}`);
