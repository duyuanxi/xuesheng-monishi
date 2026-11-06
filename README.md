# 学生模拟器 · 网页版

> 像素风 3D 校园模拟游戏。距大考 100 天，你坐在教室里 —— 怎么过这 100 天由你决定。

**线上地址（正式发布目标）：https://xuesheng-monishi.pages.dev**

> ⚠️ 本仓库只是**代码中转站**，不用于托管游戏。游戏部署在 Cloudflare Pages（项目 `xuesheng-monishi`，生产分支 `main`）。
> 任何人（或任何 AI）克隆本仓库后，按下方「发布」一节的命令即可把 `site/` 部署上线。

---

## 仓库结构

```
site/                       ← 可直接部署的构建产物（就是线上那一份）
├── index.html              3,530,184 字节，sha256 2E593288…BD7C15
├── _headers                Cloudflare Pages 缓存头
└── assets/2a88ebc74a2a/    9 个资源分片（5 个 GLB 模型 + 1 个 MP4，从原单文件里拆出）
tools/                      ← 构建 / 验证工具链（跨平台：Windows 与 Linux 均可）
├── patch_game.js           唯一的补丁入口（当前 6 个 swap）
├── build_site.js           从 136MB 真源生成 site/
├── server.js               本地静态预览服务器
├── verify_local.cjs        6 个内嵌资源逐字节校验
├── check_play.cjs          能否进入课堂
├── check_mobile.cjs        手机横屏渲染
├── check_drag.cjs          拖动转向
├── probe_aspect.cjs        画面不拉伸（缩放比 ≈ 1）
├── captain_accept.cjs      新手引导全流程
├── expected.json           资源基准 SHA-256
├── hash_expected.js        重新生成 expected.json
├── make_favicon.js / favicon.png
└── package.json            （仅 devDependency: playwright-core）
screenshots/                实机截图
部署说明.md                  构建、部署、历次改动的完整记录
接手提示词-Claude.md         交给下一个 AI 的完整交接说明
```

## 发布（克隆后一条命令上线）

```bash
git clone https://github.com/duyuanxi/xuesheng-monishi.git
cd xuesheng-monishi

# 认证（二选一）
npx wrangler login                    # 浏览器登录 Cloudflare
export CLOUDFLARE_API_TOKEN=xxxx      # 或使用 API Token（推荐给无浏览器环境）

# 部署（约 10–40 秒）
npx wrangler pages deploy site --project-name xuesheng-monishi --branch main
```

部署后访问 https://xuesheng-monishi.pages.dev 验证（边缘缓存可能滞后约 1 分钟，可用 `?cb=时间戳` 复测）。

## 本地预览

```bash
node tools/server.js 8788
# 打开 http://127.0.0.1:8788/
```

> 注意：拆分版必须通过网址打开；直接双击 `site/index.html` 会因浏览器安全策略加载不了模型。

## 修改代码并重新构建

游戏真源是一个 **136 MB 的单文件 HTML**（含内嵌模型与视频），不在本仓库里（超过 GitHub 单文件限制）。
它放在 Releases 里作为附件：**`geshihua_v21_original_base.html`**（即打所有补丁之前的干净版本）。

```bash
# 1) 下载基线（或从项目所有者处获取同名文件）
#    Releases → v1.0-base → geshihua_v21_original_base.html

# 2) 指定路径（Linux 示例；Windows 下不设则用默认路径）
export GESHIHUA_BAK=/path/to/geshihua_v21_original_base.html
export GESHIHUA_SRC=/path/to/geshihua_v21_手机横屏优化.html   # 输出，会被重新生成
export GESHIHUA_OUT=./site

# 3) 还原基线 → 打补丁 → 构建
cp "$GESHIHUA_BAK" "$GESHIHUA_SRC"
node tools/patch_game.js      # 6 个 swap 必须全部唯一命中
node tools/build_site.js

# 4) 验证
npm install                   # 只为验证脚本装 playwright-core
node tools/verify_local.cjs http://127.0.0.1:8788/
node tools/check_play.cjs  http://127.0.0.1:8788/
node tools/captain_accept.cjs http://127.0.0.1:8788/

# 5) 发布
npx wrangler pages deploy site --project-name xuesheng-monishi --branch main
```

改代码的唯一正确方式是在 `tools/patch_game.js` 里新增一个 `swap(label, 原文, 新文)`，
它要求锚点**唯一命中 1 次**，全部成功后才会写盘 —— 失败不会损坏源文件。

## 已上线功能

1. 136 MB 单文件拆成网页版、按需加载（首页 HTML 约 1.7 MB brotli；教室模型 30 MB、电视视频 36 MB 进入场景才下载）
2. 手机横屏布局适配
3. 3D 第一人称身体：坐下低头能看到自己的腿、上身与搭在课桌上的小臂
4. 像素风握笔手（替换原照片级矢量手）
5. 画面不拉伸：2D 像素画布按 16:9 等比居中，拖动判定覆盖整个视图
6. 新手引导界面：首访弹窗 + 左上角「?」重看

## 账号与凭据

| 平台 | 账号 | 说明 |
| --- | --- | --- |
| Cloudflare | `3825020582@qq.com` | 项目 `xuesheng-monishi`；密码/API Token 请向项目所有者索取，**不要提交进仓库** |
| GitHub | `duyuanxi` | 本仓库公开，克隆不需要认证 |

> 安全提醒：本仓库是**公开**的。任何密码、API Token、OAuth 凭据都不得写入仓库文件或提交记录。
> 部署认证优先使用环境变量 `CLOUDFLARE_API_TOKEN`，或在目标机器上执行 `npx wrangler login`。

## 素材与许可

- 三维模型来自 Sketchfab / Poly Pizza，均为 **CC BY** 许可，作者与出处见游戏内「场景模型与署名」。
- Three.js r128 / GLTFLoader — MIT。
- 游戏其余代码为作者原创。
