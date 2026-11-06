// Generate a 16x16 favicon PNG (no dependencies) matching the game palette.
const fs = require('fs');
const zlib = require('zlib');

const W = 16, H = 16;
const BG = [0xc8, 0x38, 0x2a];   // accent red
const FG = [0xff, 0xf6, 0xdf];   // paper cream
const rows = [];
for (let y = 0; y < H; y++) {
  const row = [0];
  for (let x = 0; x < W; x++) {
    const edge = x === 0 || y === 0 || x === W - 1 || y === H - 1;
    const bar = y === 4 && x >= 3 && x <= 12;          // title bar
    const book = y >= 7 && y <= 11 && x >= 3 && x <= 7; // book block
    const pen = y >= 7 && y <= 11 && x >= 9 && x <= 12; // pencil
    const c = (bar || book || pen) ? FG : BG;
    const shade = (!bar && !book && !pen && !edge) ? 0.88 : 1;
    row.push(Math.round(c[0] * shade), Math.round(c[1] * shade), Math.round(c[2] * shade));
  }
  rows.push(Buffer.from(row));
}
const raw = Buffer.concat(rows);

function chunk(type, data) {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4); crc.writeUInt32BE(zlib.crc32(td) >>> 0);
  return Buffer.concat([len, td, crc]);
}
const ihdr = Buffer.alloc(13);
ihdr.writeUInt32BE(W, 0); ihdr.writeUInt32BE(H, 4);
ihdr[8] = 8; ihdr[9] = 2; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;

const png = Buffer.concat([
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  chunk('IHDR', ihdr),
  chunk('IDAT', zlib.deflateSync(raw, { level: 9 })),
  chunk('IEND', Buffer.alloc(0))
]);
fs.writeFileSync(path.join(__dirname, 'favicon.png'), png);
console.log('favicon.png', png.length, 'bytes');
