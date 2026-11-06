// Expected hashes straight from the ORIGINAL single-file HTML (source of truth).
const fs = require('fs');
const crypto = require('crypto');
const SRC = process.env.GESHIHUA_SRC || 'C:\\Users\\admin\\Desktop\\geshihua_v21_手机横屏优化.html';
const html = fs.readFileSync(SRC, 'utf8');
const IDS = ['embedded-basketball', 'embedded-soccer', 'embedded-furniture', 'embedded-classroom', 'embedded-anime', 'embedded-video'];
const out = {};
for (const id of IDS) {
  const open = new RegExp('<script[^>]*id="' + id + '"[^>]*>', 'i');
  const m = open.exec(html);
  const bodyStart = m.index + m[0].length;
  const end = html.indexOf('</script>', bodyStart);
  const buf = Buffer.from(html.slice(bodyStart, end).replace(/\s+/g, ''), 'base64');
  out[id] = { bytes: buf.length, sha256: crypto.createHash('sha256').update(buf).digest('hex') };
}
fs.writeFileSync('C:\\Users\\admin\\Downloads\\新建文件夹\\expected.json', JSON.stringify(out, null, 2));
console.log(JSON.stringify(out, null, 2));
