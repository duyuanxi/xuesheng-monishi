// Reproduce the user's view: sit in the classroom and look down; also export the writing-hand art.
const { chromium } = require('playwright-core');
const fs = require('fs');
const path = require('path');
const CHROME = process.env.CHROME_BIN || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const URL = process.argv[2] || 'http://127.0.0.1:8788/';
const OUT = __dirname;

(async () => {
  const browser = await chromium.launch({
    executablePath: CHROME, headless: true,
    args: ['--no-sandbox', '--enable-unsafe-swiftshader', '--use-angle=swiftshader', '--use-gl=angle', '--ignore-gpu-blocklist']
  });
  const page = await browser.newPage({ viewport: { width: 1000, height: 640 } });
  const errors = [];
  page.on('pageerror', e => errors.push('pageerror: ' + (e && e.message)));
  page.on('console', m => { if (m.type() === 'error') errors.push('console: ' + m.text()); });

  await page.goto(URL, { waitUntil: 'domcontentloaded', timeout: 300000 });
  await page.waitForTimeout(8000);

  const env = await page.evaluate(() => {
    const cv = document.createElement('canvas');
    const gl = cv.getContext('webgl') || cv.getContext('experimental-webgl');
    return {
      webgl: !!gl,
      renderer: gl ? (() => { const d = gl.getExtension('WEBGL_debug_renderer_info'); return d ? gl.getParameter(d.UNMASKED_RENDERER_WEBGL) : 'n/a'; })() : null,
      three: typeof THREE !== 'undefined' ? THREE.REVISION : null,
      w3inited: !!(window.W3 && W3.inited),
      w3active: !!(window.W3 && W3.active)
    };
  });
  console.log('env:', JSON.stringify(env));

  await page.locator('text=开始上学').first().click({ timeout: 30000 });
  await page.waitForTimeout(9000);

  const state = await page.evaluate(() => ({
    scene: S.scene, atSeat: S.atSeat, camY: CAM.y, camHor: CAM.hor, camF: CAM.f,
    w3inited: !!(window.W3 && W3.inited),
    gl3on: (() => { try { return GL3.on(S.scene); } catch (e) { return 'ERR ' + e.message; } })(),
    gl3key: (() => { try { return GL3.key(S.scene); } catch (e) { return 'ERR ' + e.message; } })(),
    rendererDom: !!document.getElementById('g3c'),
    camPos: window.W3 && W3.camera ? [ +W3.camera.position.x.toFixed(2), +W3.camera.position.y.toFixed(2), +W3.camera.position.z.toFixed(2) ] : null,
    camRot: window.W3 && W3.camera ? [ +W3.camera.rotation.x.toFixed(3), +W3.camera.rotation.y.toFixed(3) ] : null
  }));
  console.log('seated state:', JSON.stringify(state));

  // look straight ahead / mid / fully down, capturing each
  for (const [name, pitch] of [['ahead', 0], ['mid', -70], ['down', -150]]) {
    await page.evaluate(p => { VIEW.pitch = p; }, pitch);
    await page.waitForTimeout(1200);
    const info = await page.evaluate(() => ({ hor: +CAM.hor.toFixed(1), rotX: window.W3 && W3.camera ? +W3.camera.rotation.x.toFixed(3) : null }));
    console.log('look', name, JSON.stringify(info));
    await page.screenshot({ path: path.join(OUT, 'look_' + name + '.png') });
  }

  // capture the writing hand exactly as the game draws it
  await page.evaluate(() => { VIEW.pitch = -110; OV.writing = 1; });
  await page.waitForTimeout(1500);
  await page.screenshot({ path: path.join(OUT, 'look_writing.png') });

  const hand = await page.evaluate(() => {
    try {
      const c = WRITING_HAND_PIXEL;
      const o = document.createElement('canvas'); o.width = c.width; o.height = c.height;
      const g = o.getContext('2d'); g.imageSmoothingEnabled = false; g.drawImage(c, 0, 0);
      return { url: o.toDataURL('image/png'), w: c.width, h: c.height };
    } catch (e) { return { error: String(e.message) }; }
  });
  if (hand.url) {
    fs.writeFileSync(path.join(OUT, 'hand_art.png'), Buffer.from(hand.url.split(',')[1], 'base64'));
    console.log('hand art exported:', hand.w + 'x' + hand.h);
  } else console.log('hand export failed:', JSON.stringify(hand));

  console.log('errors:', errors.length ? JSON.stringify([...new Set(errors)].slice(0, 8), null, 2) : 'none');
  await browser.close();
})().catch(e => { console.error('crashed:', e); process.exit(2); });
