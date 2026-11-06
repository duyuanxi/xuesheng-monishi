// Measure whether the pixel buffer is being scaled non-uniformly (stretched).
const { chromium } = require('playwright-core');
const CHROME = process.env.CHROME_BIN || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const URL = process.argv[2] || 'http://127.0.0.1:8788/';

const CASES = [
  { name: '手机横屏 844x390', w: 844, h: 390, mobile: true },
  { name: '手机横屏 800x360', w: 800, h: 360, mobile: true },
  { name: '手机竖屏 390x844', w: 390, h: 844, mobile: true },
  { name: '电脑 1600x900', w: 1600, h: 900, mobile: false },
];

(async () => {
  const browser = await chromium.launch({ executablePath: CHROME, headless: true, args: ['--no-sandbox', '--enable-unsafe-swiftshader'] });
  for (const c of CASES) {
    const ctx = await browser.newContext({
      viewport: { width: c.w, height: c.h }, screen: { width: c.w, height: c.h }, deviceScaleFactor: 1,
      isMobile: c.mobile, hasTouch: c.mobile,
      userAgent: c.mobile ? 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36' : undefined
    });
    const page = await ctx.newPage();
    await page.goto(URL, { waitUntil: 'domcontentloaded', timeout: 300000 });
    await page.waitForTimeout(7000);
    const m = await page.evaluate(() => {
      const r = el => { if (!el) return null; const b = el.getBoundingClientRect(); return { w: +b.width.toFixed(1), h: +b.height.toFixed(1) }; };
      const game = document.getElementById('game'), view = document.getElementById('view');
      const sc = document.getElementById('scene'), g3 = document.getElementById('g3c');
      const g = r(game), v = r(view);
      const out = {
        bodyClass: document.body.className,
        game: g, view: v,
        viewAspect: v ? +(v.w / v.h).toFixed(3) : null,
        intendedViewAspect: +(320 / 180).toFixed(3),
        sceneBacking: sc ? [sc.width, sc.height] : null,
        sceneCSS: r(sc),
        g3Backing: g3 ? [g3.width, g3.height] : null,
        g3CSS: r(g3)
      };
      if (v && sc && out.sceneCSS) {
        out.sceneScaleX = +(out.sceneCSS.w / 320).toFixed(3);
        out.sceneScaleY = +(out.sceneCSS.h / 180).toFixed(3);
        out.stretchRatio = +(out.sceneScaleX / out.sceneScaleY).toFixed(3);
      }
      if (g3 && g3.width) out.g3Aspect = +(g3.width / g3.height).toFixed(3);
      try { out.camAspect = window.W3 && W3.camera ? +W3.camera.aspect.toFixed(3) : null; } catch (e) {}
      try { out.camFov = window.W3 && W3.camera ? W3.camera.fov : null; } catch (e) {}
      return out;
    });
    console.log('=== ' + c.name + ' ===');
    console.log(JSON.stringify(m));
    console.log('  → 2D 像素横向/纵向缩放比 = ' + m.stretchRatio + (m.stretchRatio && Math.abs(m.stretchRatio - 1) > 0.02 ? '   ← 拉伸!' : '   (正常)'));
    await ctx.close();
  }
  await browser.close();
})().catch(e => { console.error('crashed:', e); process.exit(2); });
