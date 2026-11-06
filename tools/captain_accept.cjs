// 船长验收 v2：修正 fixed 元素判据 + 点击抖动兜底（以状态判据为准）。
const { chromium } = require('playwright-core');
const path = require('path');
const CHROME = process.env.CHROME_BIN || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const URL = process.argv[2] || 'https://xuesheng-monishi.pages.dev/';

const probe = () => {
  const ov = document.getElementById('gGuide');
  const cs = ov ? getComputedStyle(ov) : null;
  const r = ov ? ov.getBoundingClientRect() : null;
  const shown = !!ov && cs.display !== 'none' && cs.visibility !== 'hidden' &&
                parseFloat(cs.opacity || '1') > 0 && r.width > 2 && r.height > 2;
  return {
    hasOverlay: !!ov,
    overlayShown: shown,
    overlayZ: cs ? cs.zIndex : null,
    bodyScrollable: ov ? getComputedStyle(document.querySelector('.g-guide-body') || ov).overflowY : null,
    storage: (() => { try { return localStorage.getItem('geshihua_guide_v1'); } catch (e) { return 'ERR'; } })(),
    scene: (typeof S !== 'undefined' && S) ? S.scene : null,
    titleHidden: document.getElementById('title') ? document.getElementById('title').classList.contains('hidden') : null,
    floatVisible: (() => { const b = document.getElementById('gGuideBtn'); if (!b) return false; const c = getComputedStyle(b); const rr = b.getBoundingClientRect(); return c.display !== 'none' && rr.width > 2; })()
  };
};

(async () => {
  const browser = await chromium.launch({ executablePath: CHROME, headless: true, args: ['--no-sandbox', '--enable-unsafe-swiftshader'] });
  const results = [];
  const add = (name, pass, detail) => { results.push({ name, pass, detail }); console.log((pass ? 'PASS  ' : 'FAIL  ') + name + '  — ' + detail); };

  const ctx = await browser.newContext({
    viewport: { width: 844, height: 390 }, screen: { width: 844, height: 390 }, deviceScaleFactor: 2,
    isMobile: true, hasTouch: true,
    userAgent: 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36'
  });
  const page = await ctx.newPage();
  const errs = [];
  page.on('pageerror', e => errs.push('pageerror: ' + (e && e.message)));
  page.on('console', m => { if (m.type() === 'error') errs.push('console: ' + m.text()); });

  // 点击：先试 Playwright，超时则用页面内 el.click() 兜底；判定一律看状态
  async function clickId(id, want) {
    try { await page.locator('#' + id).first().click({ timeout: 8000 }); return 'playwright'; }
    catch (e) { await page.evaluate(i => { const el = document.getElementById(i); if (el) el.click(); }, id); return 'js-fallback(' + want + ')'; }
  }

  await page.goto(URL, { waitUntil: 'domcontentloaded', timeout: 300000 });
  await page.waitForTimeout(10000);

  let st = await page.evaluate(probe);
  add('首访出现引导遮罩', st.overlayShown === true && st.storage === null, JSON.stringify(st));
  await page.screenshot({ path: path.join(__dirname, 'captain_live_first_visit.png'), timeout: 120000, animations: 'disabled' });

  const m1 = await clickId('gGuideClose', 'close');
  await page.waitForTimeout(1000);
  st = await page.evaluate(probe);
  add('点「我知道了」关闭并写标记', st.overlayShown === false && st.storage === '1', m1 + ' ' + JSON.stringify(st));

  const m2 = await clickId('t-start', 'start');
  await page.waitForTimeout(7000);
  st = await page.evaluate(probe);
  add('关闭后可进入课堂', st.scene === 'class' && st.titleHidden === true, m2 + ' ' + JSON.stringify(st));
  await page.screenshot({ path: path.join(__dirname, 'captain_live_in_game.png'), timeout: 120000, animations: 'disabled' });

  await page.reload({ waitUntil: 'domcontentloaded', timeout: 180000 });
  await page.waitForTimeout(9000);
  st = await page.evaluate(probe);
  add('刷新后不再自动弹出', st.overlayShown === false && st.storage === '1', JSON.stringify(st));

  const m3 = await clickId('gGuideBtn', 'reopen');
  await page.waitForTimeout(1200);
  st = await page.evaluate(probe);
  add('点「?」浮标可重开', st.overlayShown === true, m3 + ' ' + JSON.stringify(st));
  await page.screenshot({ path: path.join(__dirname, 'captain_live_reopen.png'), timeout: 120000, animations: 'disabled' });

  const m4 = await clickId('gGuideClose', 'close2');
  await page.waitForTimeout(1000);
  st = await page.evaluate(probe);
  add('可再次关闭', st.overlayShown === false, m4 + ' ' + JSON.stringify(st));

  add('控制台无报错', errs.length === 0, errs.length ? JSON.stringify([...new Set(errs)].slice(0, 5)) : 'none');

  await browser.close();
  const failed = results.filter(r => !r.pass);
  console.log('\n船长验收结论: ' + (failed.length === 0 ? '全部通过 (' + results.length + '/' + results.length + ')' : failed.length + ' 项未通过'));
  process.exit(failed.length ? 1 : 0);
})().catch(e => { console.error('crashed:', e); process.exit(2); });
