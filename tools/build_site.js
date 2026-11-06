// Build the web version: index.html + external assets chunked below Cloudflare Pages' 25 MiB per-file limit.
// NO re-encoding / NO quality loss: byte-identical payloads, just split into parts.
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const SRC = process.env.GESHIHUA_SRC || 'C:\\Users\\admin\\Desktop\\geshihua_v21_手机横屏优化.html';
const OUT = process.env.GESHIHUA_OUT || 'C:\\Users\\admin\\Downloads\\新建文件夹\\site';
const CHUNK = 24 * 1024 * 1024; // 24 MiB, safely under the 25 MiB hard limit

// Assets live under a content-versioned directory so their year-long immutable cache can never go stale.
const ASSET_ROOT = path.join(OUT, 'assets');
fs.rmSync(ASSET_ROOT, { recursive: true, force: true });
fs.mkdirSync(ASSET_ROOT, { recursive: true });

console.log('reading source...');
let html = fs.readFileSync(SRC, 'utf8');

const IDS = ['embedded-basketball', 'embedded-soccer', 'embedded-furniture', 'embedded-classroom', 'embedded-anime', 'embedded-video'];
const payloads = [];

for (const id of IDS) {
  const open = new RegExp('<script[^>]*id="' + id + '"[^>]*>', 'i');
  const m = open.exec(html);
  if (!m) throw new Error('missing payload: ' + id);
  const bodyStart = m.index + m[0].length;
  const end = html.indexOf('</script>', bodyStart);
  const b64 = html.slice(bodyStart, end).replace(/\s+/g, '');
  payloads.push({ id, buf: Buffer.from(b64, 'base64') });
  html = html.slice(0, m.index) + html.slice(end + '</script>'.length);
}

// Version derives from the payload bytes only: unchanged assets keep their cached URLs across rebuilds.
const VER = crypto.createHash('sha256').update(Buffer.concat(payloads.map(p => p.buf))).digest('hex').slice(0, 12);
const ASSETS = path.join(ASSET_ROOT, VER);
fs.mkdirSync(ASSETS, { recursive: true });
console.log('asset version:', VER);

const manifest = {};
const rows = [];
for (const { id, buf } of payloads) {
  const parts = [];
  for (let off = 0, i = 0; off < buf.length; off += CHUNK, i++) {
    const name = id + '.bin.p' + i;
    fs.writeFileSync(path.join(ASSETS, name), buf.subarray(off, Math.min(buf.length, off + CHUNK)));
    parts.push('assets/' + VER + '/' + name);
  }
  manifest[id] = parts;
  rows.push({ id, bytes: buf.length, parts: parts.length });
}

// Replace the inline-decoder with a manifest-driven loader (keeps the original inline path intact for offline single-file use).
const OLD = `window.decodeEmbeddedBase64=async id=>{
  const node=$(id);if(!node)throw Error('内置资源缺失：'+id);
  const b64=node.textContent.trim();node.remove();`;
const NEW = `window.EMBEDDED_ASSETS=${JSON.stringify(manifest)};
window.decodeEmbeddedBase64=async id=>{
  const node=$(id);
  if(!node||!node.textContent.trim()){
    /* 联网版：资源拆成独立文件（每个都小于 25MiB 上限），按需下载、可被浏览器与 CDN 缓存 */
    const list=(window.EMBEDDED_ASSETS||{})[id];
    if(!list)throw Error('资源清单缺少：'+id);
    let chunks;
    try{
      chunks=await Promise.all(list.map(async url=>{
        const res=await fetch(url,{cache:'force-cache'});
        if(!res.ok)throw Error('HTTP '+res.status);
        return new Uint8Array(await res.arrayBuffer());
      }));
    }catch(e){
      throw Error('资源下载失败：'+id+'（'+e.message+'）。联网版必须通过网址访问；若要离线单文件运行，请使用原始 HTML。');
    }
    const total=chunks.reduce((n,c)=>n+c.length,0),bytes=new Uint8Array(total);
    let offset=0;for(const c of chunks){bytes.set(c,offset);offset+=c.length;}
    return bytes;
  }
  const b64=node.textContent.trim();node.remove();`;
if (!html.includes(OLD)) throw new Error('anchor for decodeEmbeddedBase64 patch not found');
html = html.replace(OLD, NEW);

const OLD2 = `    const data = document.getElementById('embedded-' + key);
    if (!data || !data.textContent.trim()) throw new Error('内置模型资源缺失：' + key);
    window.CAMPUS_MODEL_DATA[key] = data.textContent.trim();`;
const NEW2 = `    const data = document.getElementById('embedded-' + key);
    if (!data || !data.textContent.trim()) return;   /* 联网版：模型来自 assets/ 目录 */
    window.CAMPUS_MODEL_DATA[key] = data.textContent.trim();`;
html = html.includes(OLD2) ? html.replace(OLD2, NEW2) : html;

// Head polish: link-preview metadata for sharing + favicon (also stops the browser's automatic /favicon.ico 404).
const favicon = fs.readFileSync(path.join(__dirname, 'favicon.png')).toString('base64');
const TITLE = '<title>学生模拟器</title>';
if (!html.includes(TITLE)) throw new Error('title anchor not found');
html = html.replace(TITLE, TITLE +
  '\n<meta name="description" content="学生模拟器：在浏览器里体验校园生活的像素风小游戏，支持手机横屏。">' +
  '\n<meta property="og:title" content="学生模拟器">' +
  '\n<meta property="og:description" content="在浏览器里体验校园生活的像素风小游戏，支持手机横屏。">' +
  '\n<meta property="og:type" content="website">' +
  '\n<meta name="theme-color" content="#08080a">' +
  '\n<link rel="icon" type="image/png" href="data:image/png;base64,' + favicon + '">');

fs.writeFileSync(path.join(OUT, 'index.html'), html, 'utf8');

// Assets are content-versioned, so a year-long immutable cache is safe; the HTML itself stays revalidated.
fs.writeFileSync(path.join(OUT, '_headers'), '/assets/*\n  Cache-Control: public, max-age=31536000, immutable\n', 'utf8');

console.log('\n=== build result ===');
for (const r of rows) console.log(r.id.padEnd(22), (r.bytes / 1048576).toFixed(2) + 'MB', '->', r.parts, 'part(s)');
console.log('index.html:', (Buffer.byteLength(html, 'utf8') / 1048576).toFixed(2) + 'MB');

let total = 0, maxPart = 0, n = 0;
for (const f of fs.readdirSync(ASSETS)) {
  const s = fs.statSync(path.join(ASSETS, f)).size;
  total += s; maxPart = Math.max(maxPart, s); n++;
}
console.log('parts:', n, 'total:', (total / 1048576).toFixed(2) + 'MB', 'largest part:', (maxPart / 1048576).toFixed(2) + 'MiB', maxPart < 25 * 1024 * 1024 ? 'OK (<25MiB)' : 'TOO BIG');
