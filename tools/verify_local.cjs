// End-to-end local verification: real Chrome, real HTTP, byte-exact asset check.
const { chromium } = require('playwright-core');
const fs = require('fs');
const path = require('path');

const expected = JSON.parse(fs.readFileSync(path.join(__dirname, 'expected.json'), 'utf8'));
const CHROME = process.env.CHROME_BIN || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const URL = process.argv[2] || 'http://127.0.0.1:8788/';

(async () => {
  const browser = await chromium.launch({ executablePath: CHROME, headless: true, args: ['--no-sandbox', '--disable-gpu', '--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
  const page = await browser.newPage({ viewport: { width: 1000, height: 700 } });
  const errors = [];
  page.on('pageerror', e => errors.push('pageerror: ' + (e && e.message)));
  page.on('console', m => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
  page.on('requestfailed', r => errors.push('requestfailed: ' + r.url() + ' ' + (r.failure() || {}).errorText));

  const t0 = Date.now();
  await page.goto(URL, { waitUntil: 'domcontentloaded', timeout: 240000 });
  await page.waitForTimeout(6000);

  const info = await page.evaluate(() => ({
    title: document.title,
    hasGame: !!document.getElementById('game'),
    canvas: !!document.getElementById('scene'),
    three: (typeof THREE !== 'undefined') ? THREE.REVISION : null,
    manifestKeys: Object.keys(window.EMBEDDED_ASSETS || {}),
    leftoverInline: document.querySelectorAll('script[type="application/octet-stream"]').length
  }));
  console.log('page loaded in', ((Date.now() - t0) / 1000).toFixed(1) + 's');
  console.log('page info:', JSON.stringify(info));

  // 1) byte-exact check of every asset through the real loader
  const assetReport = [];
  for (const [id, exp] of Object.entries(expected)) {
    const r = await page.evaluate(async (id) => {
      const t = performance.now();
      const bytes = await window.decodeEmbeddedBase64(id);
      const view = bytes.byteOffset === 0 && bytes.byteLength === bytes.buffer.byteLength ? bytes.buffer : bytes.slice().buffer;
      const d = await crypto.subtle.digest('SHA-256', view);
      const hex = [...new Uint8Array(d)].map(b => b.toString(16).padStart(2, '0')).join('');
      return { bytes: bytes.length, sha256: hex, ms: Math.round(performance.now() - t) };
    }, id);
    const ok = r.bytes === exp.bytes && r.sha256 === exp.sha256;
    assetReport.push({ id, ok, ...r, expectedBytes: exp.bytes });
    console.log((ok ? 'PASS' : 'FAIL') + '  ' + id.padEnd(22) + (r.bytes / 1048576).toFixed(2) + 'MB  ' + r.ms + 'ms  sha256=' + (ok ? 'match' : r.sha256 + ' != ' + exp.sha256));
  }

  // 2) the two heavy payloads must actually parse (GLB scene / MP4 metadata)
  const classroom = await page.evaluate(async () => {
    const bytes = await window.decodeEmbeddedBase64('embedded-classroom');
    const gltf = await new Promise((res, rej) => new THREE.GLTFLoader().parse(bytes.buffer, '', res, rej));
    let meshes = 0, textures = 0, tris = 0;
    gltf.scene.traverse(o => { if (o.isMesh) { meshes++; const g = o.geometry; if (g && g.index) tris += g.index.count / 3; else if (g && g.attributes.position) tris += g.attributes.position.count / 3; } });
    gltf.scene.traverse(o => { for (const m of (Array.isArray(o.material) ? o.material : o.material ? [o.material] : [])) if (m.map) textures++; });
    return { meshes, textures, tris: Math.round(tris) };
  }).catch(e => ({ error: String(e && e.message || e) }));
  console.log('classroom GLB parse:', JSON.stringify(classroom));

  const anime = await page.evaluate(async () => {
    const bytes = await window.decodeEmbeddedBase64('embedded-anime');
    const gltf = await new Promise((res, rej) => new THREE.GLTFLoader().parse(bytes.buffer, '', res, rej));
    let meshes = 0; gltf.scene.traverse(o => { if (o.isMesh) meshes++; });
    return { meshes };
  }).catch(e => ({ error: String(e && e.message || e) }));
  console.log('anime GLB parse:', JSON.stringify(anime));

  const video = await page.evaluate(async () => {
    const bytes = await window.decodeEmbeddedBase64('embedded-video');
    const v = document.createElement('video');
    v.src = URL.createObjectURL(new Blob([bytes], { type: 'video/mp4' }));
    v.muted = true;
    const meta = await new Promise((res) => {
      const done = (ok, extra) => res(Object.assign({ ok }, extra || {}));
      v.onloadedmetadata = () => done(true, { w: v.videoWidth, h: v.videoHeight, duration: Math.round(v.duration * 10) / 10 });
      v.onerror = () => done(false, { code: v.error && v.error.code });
      setTimeout(() => done(false, { timeout: true }), 30000);
    });
    return meta;
  }).catch(e => ({ error: String(e && e.message || e) }));
  console.log('video blob metadata:', JSON.stringify(video));

  await page.screenshot({ path: path.join(__dirname, 'shot_title.png') });
  // second screenshot: try to enter the 3D campus if possible
  const boot = await page.evaluate(async () => {
    try {
      await new Promise(r => setTimeout(r, 1500));
      return { W3inited: !!(window.W3 && W3.inited), booted: true };
    } catch (e) { return { error: String(e) }; }
  });
  console.log('runtime:', JSON.stringify(boot));

  console.log('\n--- errors (' + errors.length + ') ---');
  for (const e of errors.slice(0, 25)) console.log(e);

  const failed = assetReport.filter(a => !a.ok);
  await browser.close();
  console.log('\nVERDICT: ' + (failed.length === 0 && errors.length === 0 ? 'ALL ASSETS BYTE-IDENTICAL, NO PAGE ERRORS' : 'CHECK NEEDED'));
  process.exit(failed.length === 0 ? 0 : 1);
})().catch(e => { console.error('verify crashed:', e); process.exit(2); });
