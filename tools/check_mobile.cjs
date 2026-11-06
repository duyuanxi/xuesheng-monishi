// Mobile landscape check against the live URL (the file is a 手机横屏优化 build).
const { chromium } = require('playwright-core');
const path = require('path');
const CHROME = process.env.CHROME_BIN || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const URL = process.argv[2];

(async () => {
  const browser = await chromium.launch({ executablePath: CHROME, headless: true, args: ['--no-sandbox', '--disable-gpu', '--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
  const ctx = await browser.newContext({
    viewport: { width: 844, height: 390 },
    screen: { width: 844, height: 390 },
    deviceScaleFactor: 3,
    isMobile: true,
    hasTouch: true,
    userAgent: 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36'
  });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push('pageerror: ' + (e && e.message)));
  page.on('console', m => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
  page.on('response', r => { if (r.status() >= 400) errors.push('HTTP ' + r.status() + ' ' + r.url()); });

  const t0 = Date.now();
  await page.goto(URL, { waitUntil: 'domcontentloaded', timeout: 300000 });
  await page.waitForTimeout(9000);

  const info = await page.evaluate(() => {
    const game = document.getElementById('game');
    const r = game ? game.getBoundingClientRect() : null;
    const mc = document.querySelector('.mc-root, [class*="mc-"]');
    return {
      title: document.title,
      viewport: [innerWidth, innerHeight],
      gameRect: r ? { w: Math.round(r.width), h: Math.round(r.height) } : null,
      kVar: getComputedStyle(document.documentElement).getPropertyValue('--k').trim(),
      mobileControls: !!mc,
      deviceSelect: !!document.getElementById('deviceModeSel'),
      canvas: (() => { const c = document.getElementById('scene'); return c ? [c.width, c.height] : null; })(),
      three: typeof THREE !== 'undefined' ? THREE.REVISION : null
    };
  });
  console.log('loaded in', ((Date.now() - t0) / 1000).toFixed(1) + 's');
  console.log(JSON.stringify(info, null, 2));
  await page.screenshot({ path: path.join(__dirname, 'shot_mobile_landscape.png') });
  console.log('errors:', errors.length ? JSON.stringify([...new Set(errors)].slice(0, 10), null, 2) : 'none');
  await browser.close();
})().catch(e => { console.error('crashed:', e); process.exit(2); });
