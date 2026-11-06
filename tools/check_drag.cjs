// Verify drag-to-look still works, including in the letterbox area beside the 16:9 canvas.
const { chromium } = require('playwright-core');
const path = require('path');
const CHROME = process.env.CHROME_BIN || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const URL = process.argv[2];

(async () => {
  const browser = await chromium.launch({ executablePath: CHROME, headless: true, args: ['--no-sandbox', '--enable-unsafe-swiftshader'] });
  const ctx = await browser.newContext({
    viewport: { width: 844, height: 390 }, screen: { width: 844, height: 390 }, deviceScaleFactor: 1,
    isMobile: true, hasTouch: true,
    userAgent: 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36'
  });
  const page = await ctx.newPage();
  const errs = [];
  page.on('pageerror', e => errs.push('pageerror: ' + (e && e.message)));
  page.on('console', m => { if (m.type() === 'error') errs.push('console: ' + m.text()); });

  await page.goto(URL, { waitUntil: 'domcontentloaded', timeout: 300000 });
  await page.waitForTimeout(9000);
  await page.locator('text=开始上学').first().click({ timeout: 40000 });
  await page.waitForTimeout(9000);

  const geom = await page.evaluate(() => {
    const v = document.getElementById('view').getBoundingClientRect();
    const c = document.getElementById('scene').getBoundingClientRect();
    return { view: [Math.round(v.x), Math.round(v.y), Math.round(v.width), Math.round(v.height)], scene: [Math.round(c.x), Math.round(c.y), Math.round(c.width), Math.round(c.height)] };
  });
  console.log('geometry:', JSON.stringify(geom));

  async function dragFrom(x, y, label) {
    const before = await page.evaluate(() => ({ yaw: +VIEW.yaw.toFixed(3), pitch: +VIEW.pitch.toFixed(3) }));
    await page.mouse.move(x, y);
    await page.mouse.down();
    for (let i = 1; i <= 6; i++) await page.mouse.move(x + i * 14, y + i * 5);
    await page.mouse.up();
    await page.waitForTimeout(400);
    const after = await page.evaluate(() => ({ yaw: +VIEW.yaw.toFixed(3), pitch: +VIEW.pitch.toFixed(3) }));
    const moved = before.yaw !== after.yaw || before.pitch !== after.pitch;
    console.log(label, 'before', JSON.stringify(before), 'after', JSON.stringify(after), moved ? '→ 拖动生效' : '→ 没反应 ✗');
    return moved;
  }

  const cy = geom.view[1] + geom.view[3] / 2;
  const mid = await dragFrom(844 / 2, cy, '画面中央拖动  ');
  const left = await dragFrom(40, cy, '左侧留白拖动  ');
  const right = await dragFrom(810, cy, '右侧留白拖动  ');

  await page.screenshot({ path: path.join(__dirname, 'shot_aspect_fixed.png') });
  console.log('errors:', errs.length ? JSON.stringify([...new Set(errs)].slice(0, 6)) : 'none');
  console.log('VERDICT:', mid && left && right ? '拖动的三个位置都有效' : '有位置拖不动');
  await browser.close();
})().catch(e => { console.error('crashed:', e); process.exit(2); });
