// Gameplay smoke test on the live URL: actually start the game and watch for errors.
const { chromium } = require('playwright-core');
const path = require('path');
const CHROME = process.env.CHROME_BIN || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const URL = process.argv[2];

(async () => {
  const browser = await chromium.launch({ executablePath: CHROME, headless: true, args: ['--no-sandbox', '--disable-gpu', '--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
  const ctx = await browser.newContext({
    viewport: { width: 844, height: 390 }, screen: { width: 844, height: 390 },
    deviceScaleFactor: 2, isMobile: true, hasTouch: true,
    userAgent: 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36'
  });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push('pageerror: ' + (e && e.message)));
  page.on('console', m => { if (m.type() === 'error' && !/blob:/.test(m.text())) errors.push('console: ' + m.text()); });
  page.on('response', r => { if (r.status() >= 400) errors.push('HTTP ' + r.status() + ' ' + r.url()); });

  await page.goto(URL, { waitUntil: 'domcontentloaded', timeout: 300000 });
  await page.waitForTimeout(9000);

  const startBtn = page.locator('text=开始上学').first();
  await startBtn.click({ timeout: 30000 });
  console.log('clicked 开始上学');
  await page.waitForTimeout(12000);
  await page.screenshot({ path: path.join(__dirname, 'shot_play_1.png') });

  // walk around a bit + interact
  for (const k of ['w', 'w', 'd', 'e', 'w']) { await page.keyboard.press(k); await page.waitForTimeout(1200); }
  await page.waitForTimeout(6000);
  await page.screenshot({ path: path.join(__dirname, 'shot_play_2.png') });

  const state = await page.evaluate(() => ({
    three: typeof THREE !== 'undefined' ? THREE.REVISION : null,
    w3inited: !!(window.W3 && W3.inited),
    scene: typeof S !== 'undefined' && S ? S.scene : null,
    titleHidden: document.getElementById('title') ? document.getElementById('title').classList.contains('hidden') : null,
    canvasSize: (() => { const c = document.getElementById('scene'); return c ? [c.width, c.height] : null; })(),
    loadedAssets: (window.CAMPUS_MODEL_DATA && Object.keys(window.CAMPUS_MODEL_DATA).length) || 0
  }));
  console.log('state:', JSON.stringify(state));
  console.log('errors:', errors.length ? JSON.stringify([...new Set(errors)].slice(0, 12), null, 2) : 'none');
  await browser.close();
})().catch(e => { console.error('crashed:', e); process.exit(2); });
