// Apply the two gameplay fixes directly to the ORIGINAL single-file HTML:
//   1) 3D first-person body, so sitting at your desk and looking down shows your own legs.
//   2) Rewrite the writing hand in the game's flat pixel-art palette.
const fs = require('fs');
const path = require('path');

const SRC = process.env.GESHIHUA_SRC || 'C:\\Users\\admin\\Desktop\\geshihua_v21_手机横屏优化.html';
const BAK = process.env.GESHIHUA_BAK || 'C:\\Users\\admin\\Desktop\\geshihua_v21_手机横屏优化.改腿手前备份.html';

/* 【改】新手引导界面：独立的一段 <style>+<div>+<script>，插在 HTML 末尾 </body> 之前。
   整块内容以模板字符串内联在这里（没有反引号与 ${，可直接嵌入），补丁脚本自带自检，
   读不到完整引导块时会在写盘前报错。 */
const guideSnippet = `<!-- ===== 新手引导（纯新增，独立于游戏既有样式与脚本；不改动任何既有内容） ===== -->
<style>
/* 引导用到的图层、面板、按钮、浮标全部带 g- 前缀，只作用于新增元素 */
.g-guide,
.g-guide *{box-sizing:border-box;margin:0;padding:0;-webkit-tap-highlight-color:transparent}
/* 整页遮罩：固定铺满视口，层级远高于既有最高层（#phone 40 与手机虚拟键 #mobileControls 70）。
   遮罩只负责"看"：整层不吃指针事件，既有控件（标题页「开始上学」、设置、手机按键…）
   永远不会被引导挡住；键盘 / 滚轮 / 触摸滑动由脚本在捕获阶段接管，
   用户点到引导以外的地方就自动退场。 */
.g-guide{position:fixed;inset:0;z-index:2147483000;display:flex;align-items:center;justify-content:center;background:rgba(8,8,10,.86);overflow:auto;overscroll-behavior:contain;padding:calc(16px + env(safe-area-inset-top)) calc(16px + env(safe-area-inset-right)) calc(16px + env(safe-area-inset-bottom)) calc(16px + env(safe-area-inset-left));font-family:"Zpix","Fusion Pixel 12px Proportional SC","Microsoft YaHei","PingFang SC","Noto Sans SC",sans-serif;color:var(--ui-fg,#3b2a1d);user-select:none;-webkit-user-select:none;pointer-events:none}
.g-guide.g-hidden{display:none}
.g-guide-box{pointer-events:none;width:min(660px,100%);max-height:100%;overflow:hidden;background:var(--ui-bg,#fff6df);color:var(--ui-fg,#3b2a1d);border:3px solid var(--ui-border,#3b2a1d);box-shadow:5px 5px 0 var(--ui-border,#3b2a1d);padding:max(10px,1.5cqh) max(10px,1.5cqw) max(12px,1.8cqh);display:flex;flex-direction:column;gap:clamp(6px,1.1cqh,12px)}
/* 正文区域单独滚动：面板高度受限时按钮始终留在底部，不需要 sticky */
.g-guide-body{min-height:0;overflow:auto;overscroll-behavior:contain;display:flex;flex-direction:column;gap:clamp(6px,1.1cqh,12px)}
.g-guide-hd{border-bottom:3px solid var(--ui-border,#3b2a1d);padding-bottom:clamp(5px,1cqh,10px)}
.g-guide-title{font-size:clamp(17px,2.2cqw,30px);line-height:1.25;letter-spacing:.02em}
.g-guide-lead{margin-top:4px;font-size:clamp(12px,1.3cqw,18px);line-height:1.6;color:#7a5b3a}
.g-guide-cols{display:grid;grid-template-columns:1fr 1fr;gap:clamp(6px,1cqw,12px)}
.g-guide-card{border:2px solid var(--ui-border,#3b2a1d);box-shadow:2px 2px 0 var(--ui-border,#3b2a1d);padding:clamp(5px,1cqh,10px) clamp(7px,1cqw,12px);display:flex;flex-direction:column;gap:3px;background:var(--ui-bg,#fff6df)}
.g-guide-card h3{font-size:clamp(12px,1.35cqw,18px);display:flex;align-items:center;gap:6px}
.g-guide-card h3::before{content:'';width:8px;height:8px;background:var(--accent,#c8382a);flex:none}
.g-guide-card p{font-size:clamp(11px,1.25cqw,17px);line-height:1.6}
.g-guide-card .g-hint{color:#8a6a48;font-size:clamp(10px,1.05cqw,14px);line-height:1.5}
.g-guide-card kbd{display:inline-block;border:1px solid var(--ui-border,#3b2a1d);box-shadow:1px 1px 0 var(--ui-border,#3b2a1d);background:#fff9e6;padding:0 4px;margin:0 1px;font:inherit;font-size:.94em;line-height:1.45}
.g-guide-sec{border:2px solid var(--ui-border,#3b2a1d);box-shadow:2px 2px 0 var(--ui-border,#3b2a1d);padding:clamp(5px,1cqh,10px) clamp(7px,1cqw,12px);display:flex;flex-direction:column;gap:3px}
.g-guide-sec h3{font-size:clamp(12px,1.35cqw,18px);color:var(--accent,#c8382a)}
.g-guide-sec p{font-size:clamp(11px,1.25cqw,17px);line-height:1.62}
/* 按钮固定在面板底部行（面板不滚动，正文单独滚动），内容再长也点得到 */
.g-guide-btns{display:flex;flex-wrap:wrap;gap:clamp(6px,1.1cqw,12px);justify-content:flex-end;background:var(--ui-bg,#fff6df);border-top:2px solid var(--ui-border,#3b2a1d);padding-top:clamp(5px,1cqh,10px)}
.g-guide-btn{pointer-events:auto;font:inherit;font-size:clamp(12px,1.3cqw,18px);padding:max(6px,1cqh) max(10px,2cqw);background:var(--btn-bg,#ffe9a8);color:var(--ui-fg,#3b2a1d);border:2px solid var(--ui-border,#3b2a1d);box-shadow:2px 2px 0 var(--ui-border,#3b2a1d);cursor:pointer;white-space:nowrap;transition:none}
.g-guide-btn:hover,.g-guide-btn:focus-visible{background:var(--btn-hover,#ffd45e);outline:none}
.g-guide-btn:active{transform:translate(2px,2px);box-shadow:none}
.g-guide-btn.g-ghost{background:var(--ui-bg,#fff6df);opacity:.85}
/* 只在窄屏（手机竖屏）把两栏说明并成一栏，横屏与电脑仍是两栏 */
@media (max-width:480px){.g-guide-cols{grid-template-columns:1fr}}
.g-guide-fixed{pointer-events:auto;position:absolute;left:8px;top:8px;width:30px;height:30px;min-width:0;padding:0;border:2px solid var(--ui-border,#3b2a1d);box-shadow:2px 2px 0 var(--ui-border,#3b2a1d);background:rgba(255,246,223,.55);color:var(--ui-fg,#3b2a1d);font:700 16px/1 "Zpix","Fusion Pixel 12px Proportional SC","Microsoft YaHei","PingFang SC","Noto Sans SC",sans-serif;cursor:pointer;z-index:9000;display:flex;align-items:center;justify-content:center;touch-action:manipulation}
.g-guide-fixed:hover,.g-guide-fixed:focus-visible{background:rgba(255,212,94,.92);outline:none}
.g-guide-fixed:active{transform:translate(2px,2px);box-shadow:none}
/* 极端扁屏（画面高度比手机按键最上沿还矮）时的兜底位置：贴在左下角，避开左侧方向键 */
.g-guide-fixed.g-guide-low{top:auto;bottom:8px}
</style>
<div id="gGuide" class="g-guide g-hidden" role="dialog" aria-modal="true" aria-labelledby="gGuideTitle" aria-describedby="gGuideLead">
  <div class="g-guide-box">
    <button type="button" id="gGuideBtn" class="g-guide-fixed" aria-label="查看新手引导" title="新手引导（怎么玩）">?</button>
    <div class="g-guide-body">
    <div class="g-guide-hd">
      <h2 class="g-guide-title" id="gGuideTitle">新手引导 · 怎么玩</h2>
      <p class="g-guide-lead" id="gGuideLead">《学生模拟器》——距大考 100 天，这 100 天怎么过由你决定</p>
    </div>
    <div class="g-guide-cols">
      <div class="g-guide-card">
        <h3>电脑操作</h3>
        <p>拖动看四周 · <kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd> / 方向键 移动 · <kbd>E</kbd> / <kbd>F</kbd> 互动 · 空格 跳 · <kbd>Shift</kbd> 跑 · <kbd>P</kbd> 手机</p>
        <p class="g-hint">鼠标按住画面拖动即可转头看四周。</p>
      </div>
      <div class="g-guide-card">
        <h3>手机操作</h3>
        <p>手指拖动画面转向 · 左侧方向键移动 · 右侧 互动E / 动作F / 跳跃 / 地图 / 手机 / 回正</p>
        <p class="g-hint">横屏玩最舒服：左边走路，右边互动。</p>
      </div>
    </div>
    <div class="g-guide-sec">
      <h3>目标</h3>
      <p>分数记录备考结果；心智、共情、韧性、眼界和自我认同记录你怎样成长。选错会付出代价，也会留下以后用得上的经验。</p>
    </div>
    <div class="g-guide-sec">
      <h3>玩法</h3>
      <p>点「开始上学」进入课堂，课堂上用底部选项推进剧情；课间可以起身走动、找同学聊天、用手机看状态</p>
    </div>
    </div>
    <div class="g-guide-btns">
      <button type="button" id="gGuideStart" class="g-guide-btn">开始上学</button>
      <button type="button" id="gGuideClose" class="g-guide-btn g-ghost">我知道了</button>
    </div>
  </div>
</div>
<script>
/* 新手引导逻辑：只用新增元素与新增 localStorage 键，不读写游戏状态、不改既有脚本 */
(function () {
  var KEY = 'geshihua_guide_v1';
  var ov = document.getElementById('gGuide');
  var game = document.getElementById('game');
  if (!ov) return;
  /* 浮标挂进 #game，跟着游戏窗口走，始终待在左上角：不覆盖底部方向键与右侧按键 */
  var dot = document.getElementById('gGuideBtn');
  if (dot && game && dot.parentNode !== game) game.appendChild(dot);
  function stored() { try { return localStorage.getItem(KEY); } catch (e) { return null; } }
  function remember() { try { localStorage.setItem(KEY, '1'); } catch (e) {} }
  function isOpen() { return !ov.classList.contains('g-hidden'); }
  function show() { ov.classList.remove('g-hidden'); }
  function hide() { ov.classList.add('g-hidden'); }
  /* 引导打开时吞掉键盘事件，避免空格/回车等误触发游戏操作 */
  function onKey(ev) {
    if (!isOpen()) return;
    var t = ev.target, n = (t && t.tagName) || '';
    if (n === 'INPUT' || n === 'TEXTAREA' || n === 'SELECT' || (t && t.isContentEditable)) return;
    if (ev.key === 'Escape') hide();
    ev.preventDefault();
    ev.stopPropagation();
    ev.stopImmediatePropagation();
  }
  window.addEventListener('keydown', onKey, true);
  window.addEventListener('keyup', onKey, true);
  /* 遮罩不吃指针事件，所以滚动由这里转接：滚轮 / 手指滑动 → 面板滚动，
     顺便挡住引导打开时游戏镜头的拖动。 */
  var panel = ov.querySelector('.g-guide-body') || ov.firstElementChild;
  function scrollPanel(dy) { if (panel) panel.scrollTop += dy; }
  function onWheel(ev) {
    if (!isOpen()) return;
    ev.preventDefault(); ev.stopPropagation();
    scrollPanel(ev.deltaY);
  }
  window.addEventListener('wheel', onWheel, { capture: true, passive: false });
  var touchY = null;
  function onTouchStart(ev) {
    if (!isOpen() || !ev.touches || !ev.touches.length) { touchY = null; return; }
    touchY = ev.touches[0].clientY;
  }
  function onTouchMove(ev) {
    if (!isOpen() || !ev.touches || !ev.touches.length) return;
    var y = ev.touches[0].clientY;
    if (touchY !== null) scrollPanel(touchY - y);
    touchY = y;
    ev.preventDefault(); ev.stopPropagation();
  }
  window.addEventListener('touchstart', onTouchStart, { capture: true, passive: true });
  window.addEventListener('touchmove', onTouchMove, { capture: true, passive: false });
  /* 点到引导以外的地方（含被遮罩压着的既有按钮，例如标题页「开始上学」）：
     引导自动退场并记下"看过"，绝不挡在游戏前面。 */
  function onOutsideClick(ev) {
    if (!isOpen()) return;
    var t = ev.target;
    if (!t || ov.contains(t)) return;
    if (dot && (t === dot || dot.contains(t))) return;
    hide(); remember();
  }
  window.addEventListener('click', onOutsideClick, true);
  var close1 = document.getElementById('gGuideClose'), start1 = document.getElementById('gGuideStart');
  if (close1) close1.addEventListener('click', function (ev) { ev.stopPropagation(); hide(); remember(); });
  if (start1) start1.addEventListener('click', function (ev) { ev.stopPropagation(); hide(); remember(); });
  if (dot) dot.addEventListener('click', function (ev) {
    ev.stopPropagation(); ev.preventDefault();
    if (isOpen()) hide(); else show();
  });
  /* 首次访问才整页弹出；刷新后不再打扰，需要时点左上角「?」重看 */
  if (stored() !== '1') show();

  /* 极扁屏兜底：只读取既有按键的位置做判断，绝不改动既有元素。
     默认浮标在游戏窗口左上角（CSS 里的 left/top:8px）；若左侧方向键比它更高、
     把左上角占了，就用追加的 g-guide-low 把浮标挪到左下角（那圈不会摆放虚拟按键）。
     判断始终基于"默认位置"算出来，不依赖浮标当前在哪，免得来回跳。 */
  /* 虚拟方向键是进入游戏时才生成的，所以每次都重新取一次，取不到就跳过兜底判断。 */
  function avoidPad() {
    if (!dot || !game) return;
    var g = game.getBoundingClientRect();
    var dl = g.left + 8, dt = g.top + 8, dr = dl + 30, db = dt + 30;   /* 与 .g-guide-fixed 的 8px/30px 保持一致 */
    var needLow = db > window.innerHeight || dt < 0;
    var pad = document.querySelector('.mc-pad');
    if (!needLow && pad) {
      var p = pad.getBoundingClientRect();
      if (pad.getClientRects().length && p.width >= 1 && p.height >= 1) {
        needLow = dl < p.right && p.left < dr && dt < p.bottom && p.top < db;
      }
    }
    dot.classList.toggle('g-guide-low', needLow);
  }
  var pending = false;
  function scheduleAvoid() {
    if (pending) return;
    pending = true;
    window.requestAnimationFrame(function () { pending = false; avoidPad(); });
  }
  window.addEventListener('resize', scheduleAvoid, { passive: true });
  window.addEventListener('orientationchange', scheduleAvoid, { passive: true });
  /* 虚拟按键是在进入游戏后才出现的，所以额外观察它的显隐变化，
     并在开局一小段时间里每 0.5 秒复查一次（只读位置，跑满 12 秒后自动停止）。 */
  try { if (window.MutationObserver) new MutationObserver(scheduleAvoid).observe(document.getElementById('mobileControls') || document.body, { attributes: true, attributeFilter: ['class'], subtree: true, childList: true }); } catch (e) {}
  var checks = 0, ticker = window.setInterval(function () {
    avoidPad();
    if (++checks > 180) window.clearInterval(ticker);
  }, 500);
  /* 点过标题页按钮（开始上学 / 再来一次）后按键才真正登场，这时再复查两次 */
  document.addEventListener('click', function () {
    window.setTimeout(avoidPad, 400);
    window.setTimeout(avoidPad, 2500);
  }, true);
  avoidPad();
  scheduleAvoid();
})();
</script>
`;
for (const marker of ['<style>', 'id="gGuide"', 'geshihua_guide_v1', '</script>']) {
  if (!guideSnippet.includes(marker)) throw new Error('内联引导块内容不完整，缺少：' + marker);
}
console.log('guide snippet:', guideSnippet.length, 'chars inline');

if (!fs.existsSync(BAK)) {
  console.log('creating backup ->', path.basename(BAK));
  fs.copyFileSync(SRC, BAK);
} else console.log('backup already exists, keeping it');

let html = fs.readFileSync(SRC, 'utf8');
const before = html.length;
console.log('source chars:', before);

function swap(label, oldText, newText) {
  const n = html.split(oldText).length - 1;
  if (n !== 1) throw new Error(`[${label}] anchor matched ${n} times, expected exactly 1`);
  html = html.replace(oldText, newText);
  console.log('patched:', label);
}

/* ---------------------------------------------------------------
   1) 像素风握笔手（替换原来的照片级矢量手）
   --------------------------------------------------------------- */
swap('drawHands', `function drawHands(t, tip) {
  G = b;
  // tip 是纸面落笔点；位置只取整数，移动时不会出现半像素模糊。
  const tx = Math.round(tip ? tip[0] : 145);
  const ty = Math.round(tip ? tip[1] : 143);
  b.save(); b.imageSmoothingEnabled=false;
  b.drawImage(WRITING_HAND_PIXEL,tx-4,ty-36,144,144);
  b.restore();
}`, `/* 【改】像素风握笔右手：与场景精灵共用同一套色板和方块画法，整数像素、无渐变、无抗锯齿 */
function drawHands(t, tip) {
  G = b;
  // tip 是纸面落笔点；位置只取整数，移动时不会出现半像素模糊。
  const tx = Math.round(tip ? tip[0] : 145);
  const ty = Math.round(tip ? tip[1] : 143);
  const sk = P.skin, sks = P.skinShade;
  b.save();
  /* 袖子：白色校服 + 蓝色袖口，斜向右下伸出画面 */
  R(tx + 18, ty + 7, 24, 13, P.uni);
  R(tx + 18, ty + 7, 24, 4, P.uniB);
  R(tx + 26, ty + 17, 28, 14, P.uni);
  R(tx + 36, ty + 28, 30, 18, P.uni);
  /* 小臂 */
  R(tx + 20, ty - 8, 10, 20, sk);
  R(tx + 20, ty - 8, 10, 2, sks);
  /* 笔杆：从笔尖向右上方，逐格推进 */
  LN(tx + 17, ty - 15, tx + 1, ty, P.ink, 4);
  LN(tx + 17, ty - 15, tx + 1, ty, '#4a6ba8', 1);
  /* 笔尖 */
  R(tx - 1, ty - 2, 3, 3, '#86a6be');
  R(tx - 1, ty - 1, 2, 2, P.uniB);
  /* 手背 */
  R(tx + 9, ty - 9, 16, 12, sk);
  R(tx + 9, ty + 1, 16, 2, sks);
  /* 四指扣住笔杆 */
  for (let i = 0; i < 4; i++) { const L = i === 3 ? 3 : 4; R(tx + 10 + i * 4, ty - 9 - L, 3, L, sk); R(tx + 10 + i * 4, ty - 9 - L, 3, 1, sks); }
  /* 拇指 */
  R(tx + 5, ty - 7, 6, 5, sk);
  R(tx + 5, ty - 3, 6, 1, sks);
  b.restore();
}`);

/* ---------------------------------------------------------------
   2) 三维第一人称身体：坐在座位上时，低头看得见自己的腿
   --------------------------------------------------------------- */
swap('playerBody call', `    cam.updateProjectionMatrix();
    W3X.tick(t, null); people(k, t); env();`, `    cam.updateProjectionMatrix();
    playerBody();   /* 【改】把玩家自己的身体放进第一人称画面，坐下低头能看见腿 */
    W3X.tick(t, null); people(k, t); env();`);

swap('playerBody module', `  /* ---------- 每帧：把原来的镜头换算到三维地图 ---------- */
  function render(t) {`, `  /* ---------- 【改】第一人称身体：坐下时自己的上半身和腿脚进入画面 ----------
     全部由方块拼成，颜色取自 2D 精灵的校服色板。坐着时锚在椅子上、朝课桌，
     扭头不会带着身子转，课桌照常遮挡。上身按略伏在桌上的姿势摆放，
     低头能看到肩、胸、校服蓝条纹、双臂、肚子，以及前面的大腿、膝盖和鞋。 */
  const playerBody = (() => {
    const T3 = W3.T3, BOXG = new T3.BoxGeometry(1, 1, 1), MAT = new Map();
    const g = new T3.Group(); g.visible = false;
    let built = false;
    const mat = c => { let m = MAT.get(c); if (!m) { m = new T3.MeshLambertMaterial({ color: c, side: T3.DoubleSide }); MAT.set(c, m); } return m; };
    const seg = (c, x, y, z, sx, sy, sz, rz = 0, rx = 0) => { const q = new T3.Mesh(BOXG, mat(c)); q.position.set(x, y, z); q.scale.set(sx, sy, sz); q.rotation.set(rx, 0, rz); g.add(q); return q; };
    function build() {
      if (built) return true;
      if (!W3.scene) return false;
      built = true;
      const PANTS = 0x141d2e, PANTS2 = 0x0e1522, SHOE = 0xa3a199, SOLE = 0x2a2d33;
      const SHIRT = 0xd8d9d5, SHIRT2 = 0xcbccc8, SHIRT3 = 0xbec0bc, STRIPE = 0x1c3a66;
      /* 局部坐标：原点在椅子中心的地面上，-z 指向课桌，眼睛大约在 (0,1.24,.07)。
         上身略前倾，前襟落在眼睛前下方，低头才看得见；抬头看黑板时整块都在视线以下。
         蓝条纹比胸围宽一点，从正上方也能看见一圈蓝边。 */
      seg(SHIRT, -.105, .835, .14, .23, .10, .26, .30);/* 左肩（向外下斜） */
      seg(SHIRT, .105, .835, .14, .23, .10, .26, -.30);/* 右肩 */
      seg(SHIRT2, 0, .71, .16, .37, .22, .28);         /* 胸 */
      seg(STRIPE, 0, .625, .16, .41, .05, .32);        /* 校服蓝条纹 */
      seg(SHIRT3, 0, .535, .15, .34, .15, .30);        /* 腹 */
      seg(SHIRT, .255, .72, .15, .09, .30, .24);       /* 右臂 */
      seg(SHIRT, -.255, .72, .15, .09, .30, .24);      /* 左臂 */
      seg(SHIRT, .265, .81, -.05, .085, .07, .40);     /* 右小臂搭在桌面上 */
      seg(SHIRT, -.265, .81, -.05, .085, .07, .40);    /* 左小臂搭在桌面上 */
      seg(PANTS, 0, .425, .10, .40, .16, .34);         /* 胯 */
      seg(PANTS, -.11, .435, -.13, .15, .11, .46);     /* 左大腿 */
      seg(PANTS, .11, .435, -.13, .15, .11, .46);      /* 右大腿 */
      seg(PANTS2, -.11, .225, -.42, .14, .35, .13);    /* 左小腿 */
      seg(PANTS2, .11, .225, -.42, .14, .35, .13);     /* 右小腿 */
      seg(SHOE, -.11, .06, -.52, .14, .07, .22);       /* 左脚 */
      seg(SHOE, .11, .06, -.52, .14, .07, .22);        /* 右脚 */
      seg(SOLE, -.11, .015, -.52, .14, .03, .22);
      seg(SOLE, .11, .015, -.52, .14, .03, .22);
      W3.scene.add(g);
      return true;
    }
    return function update() {
      const cam = W3.camera;
      if (!cam) { g.visible = false; return; }
      const seatScript = (S.scene === 'class' || S.scene === 'exam') && S.atSeat && ME && !ROAM.on;
      const sitRoam = W3RT.sitting() && W3RT.eye() > 0.8;
      if (!seatScript && !sitRoam) { g.visible = false; return; }
      if (!build()) { g.visible = false; return; }
      g.visible = true;
      const eye = seatScript ? CAM.y : W3RT.eye();
      g.position.set(cam.position.x, cam.position.y - eye, cam.position.z);
      if (seatScript) {
        /* 锚在椅子上、朝着课桌，避免歪头时整条腿跟着转 */
        const M2 = GL3MAP.class, s = seatXZ(ME), a = M2(s.x, s.zs), b2 = M2(s.x, s.zs - .42);
        g.position.x = a[0]; g.position.z = a[1];
        g.rotation.y = Math.atan2(-(b2[0] - a[0]), -(b2[1] - a[1]));
      } else g.rotation.y = cam.rotation.y;
    };
  })();

  /* ---------- 每帧：把原来的镜头换算到三维地图 ---------- */
  function render(t) {`);

/* ---------------------------------------------------------------
   3) 2D 像素画布等比缩放居中（修「画面拉伸」）
   --------------------------------------------------------------- */
swap('scene fit', `cvs.addEventListener('pointerdown',ev=>{if(!canView()||ev.button!==0)return; if(VIEW.mouseFree){resumeMouseControl();VIEW.suppressClick=true;setTimeout(()=>VIEW.suppressClick=false,180);} VIEW.pointer=ev.pointerId; VIEW.x=ev.clientX; VIEW.y=ev.clientY; VIEW.moved=false; cvs.setPointerCapture(ev.pointerId);});
cvs.addEventListener('pointermove',ev=>{`, `/* 【改】2D 像素画布按 16:9 等比缩放并居中 -------------------------------------
   原来 #scene 被 CSS 拉成 100%×100%，可 #view 在手机横屏下是 844×269（3.14:1），
   320×180（16:9）的画面就被横向拉伸了约 1.76 倍。现在按能放下的最大等比尺寸居中绘制，
   多出来的两侧留空（透明），三维画面本来就按容器比例自适应，会自然铺满整块区域。
   拖动视角的判定区同时从画布扩大到整个 #view，避免两侧留白处拖不动。 */
(() => {
  const host = document.getElementById('view'), cv = document.getElementById('scene');
  if (!host || !cv) return;
  function fitSceneCanvas() {
    const r = host.getBoundingClientRect();
    if (r.width < 2 || r.height < 2) return;
    const k = Math.min(r.width / 320, r.height / 180);
    const w = Math.round(320 * k), h = Math.round(180 * k), s = cv.style;
    s.setProperty('position', 'absolute', 'important');
    s.setProperty('inset', 'auto', 'important');
    s.setProperty('left', Math.round((r.width - w) / 2) + 'px', 'important');
    s.setProperty('top', Math.round((r.height - h) / 2) + 'px', 'important');
    s.setProperty('transform', 'none', 'important');
    s.setProperty('width', w + 'px', 'important');
    s.setProperty('height', h + 'px', 'important');
  }
  window.__fitSceneCanvas = fitSceneCanvas;
  fitSceneCanvas();
  if (window.ResizeObserver) { try { new ResizeObserver(fitSceneCanvas).observe(host); } catch (e) {} }
  window.addEventListener('resize', fitSceneCanvas);
  window.addEventListener('orientationchange', () => setTimeout(fitSceneCanvas, 80));
  setTimeout(fitSceneCanvas, 60); setTimeout(fitSceneCanvas, 400); setTimeout(fitSceneCanvas, 1200);
})();

$('view').addEventListener('pointerdown',ev=>{if(!canView()||ev.button!==0)return; if(VIEW.mouseFree){resumeMouseControl();VIEW.suppressClick=true;setTimeout(()=>VIEW.suppressClick=false,180);} VIEW.pointer=ev.pointerId; VIEW.x=ev.clientX; VIEW.y=ev.clientY; VIEW.moved=false; try{$('view').setPointerCapture(ev.pointerId);}catch(e){} });
$('view').addEventListener('pointermove',ev=>{`);

swap('pointer up', `cvs.addEventListener('pointerup',releaseView);cvs.addEventListener('pointercancel',releaseView);
cvs.addEventListener('click',ev=>{if(VIEW.suppressClick||VIEW.mouseFree||!canWalk())return;ev.stopPropagation();useAimedObject();});`, `$('view').addEventListener('pointerup',releaseView);$('view').addEventListener('pointercancel',releaseView);
$('view').addEventListener('click',ev=>{if(VIEW.suppressClick||VIEW.mouseFree||!canWalk())return;ev.stopPropagation();useAimedObject();});`);

/* ---------------------------------------------------------------
   6) 新手引导界面（纯新增）：整页首次访问遮罩 + 左上角常驻「?」浮标。
      只在 </body> 前插入一整块独立 <style>+<div>+<script>；
      不改任何既有行、既有 DOM、既有样式和游戏逻辑，也不读写游戏状态。
   --------------------------------------------------------------- */
swap('guide overlay', `</body>
</html>`, guideSnippet + `</body>
</html>`);

fs.writeFileSync(SRC, html, 'utf8');
console.log('\nwritten:', SRC);
console.log('chars:', before, '->', html.length, `(${html.length - before})`);
