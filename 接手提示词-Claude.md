# 给 Claude 的项目接手提示词（v2 · 跨平台 + GitHub 中转 + Cloudflare 发布）

> 用法：把「---」之间的内容整份复制给 Claude（Claude Code / Claude 网页版均可）。
> v2 变更：GitHub 仓库已建好（只作代码中转）、补充 Linux 环境操作、补充账号与凭据说明。

---

你是《学生模拟器》这个项目的接手维护者。这是一个已经上线、可公开访问的像素风网页游戏。你的任务是接手后续的修改、排障与**发布**。

**发布目标固定为 Cloudflare Pages：https://xuesheng-monishi.pages.dev**
**GitHub 只是代码中转站**（用来取代码、存历史），不是托管平台 —— 不要开 GitHub Pages，不要把游戏"发到 GitHub"。

请先完整读完本提示词，然后只执行最后一节「第一步」并向我汇报。**在得到我确认之前，不要修改任何文件、不要部署。**

## 一、项目是什么

- 游戏：《学生模拟器》——类 3D 像素校园模拟。距大考 100 天，玩家坐在教室里做选择推进剧情。
- 线上地址：https://xuesheng-monishi.pages.dev
- 托管：Cloudflare Pages，项目名 `xuesheng-monishi`，生产分支 `main`
- Cloudflare 账号（邮箱）：`3825020582@qq.com`，Account ID `f5c25fc39c68d8f51898d2af725f4762`
- 线上首页当前基线：HTTP 200，**3,530,184 字节**，sha256 = `2E59328820AC534BAA0B125FC8FA37FF8CD01C94044554CC07D8E0ECE0BD7C15`
- 原始形态：一个 **136 MB 的单文件 HTML**（内嵌 6 个二进制资源：5 个 GLB 模型 + 1 个 MP4）
- 部署形态：`site/` 目录 = `index.html` + `_headers` + `assets/2a88ebc74a2a/`（9 个分片，共约 95 MB）

## 二、代码在 GitHub（公开，克隆无需认证）

```
https://github.com/duyuanxi/xuesheng-monishi
```

```bash
git clone https://github.com/duyuanxi/xuesheng-monishi.git
cd xuesheng-monishi
```

仓库结构：

| 路径 | 内容 |
| --- | --- |
| `site/` | **可直接部署的构建产物**（就是线上那一份） |
| `tools/patch_game.js` | 唯一的补丁入口，当前 6 个 swap |
| `tools/build_site.js` | 从 136 MB 真源生成 `site/` |
| `tools/*.cjs` | Playwright 验证脚本 |
| `tools/expected.json` | 资源基准 SHA-256 |
| `tools/server.js` | 本地预览服务器 |
| `README.md` / `部署说明.md` | 项目说明、构建与历次改动记录 |
| `screenshots/` | 实机截图 |

**136 MB 的游戏真源不在仓库里**（超过 GitHub 单文件限制），它放在 **Releases** 里：
`v1.0-base` → 附件 `geshihua_v21_原始基线备份.html`（打所有补丁之前的干净版本）。
只有"要改代码重新构建"时才需要它；只是发布现成的 `site/` 不需要。

## 三、你的工作环境：Linux

下面的路径对照表覆盖两种情况。如果你在 Linux 新机器上工作，用右列。

| 用途 | Windows 原机 | Linux 新机（你） |
| --- | --- | --- |
| 仓库 | `C:\Users\admin\Downloads\新建文件夹` | 任意，如 `~/xuesheng-monishi` |
| 游戏真源（构建输出） | `C:\Users\admin\Desktop\geshihua_v21_手机横屏优化.html` | `$GESHIHUA_SRC`（任意路径） |
| 干净基线 | `C:\Users\admin\Desktop\...改腿手前备份.html` | `$GESHIHUA_BAK`（从 Releases 下载） |
| 构建产物 | `...\新建文件夹\site` | `$GESHIHUA_OUT`，一般就是 `./site` |

工具链已跨平台化：`patch_game.js` / `build_site.js` / `hash_expected.js` 支持环境变量
`GESHIHUA_SRC`、`GESHIHUA_BAK`、`GESHIHUA_OUT`；验证脚本支持 `CHROME_BIN` 指定浏览器可执行文件。
**不设环境变量时回落到 Windows 默认路径**，所以在原机上行为完全不变。

## 四、最快路径：不改代码，只发布（最常见）

```bash
git clone https://github.com/duyuanxi/xuesheng-monishi.git
cd xuesheng-monishi

# 认证（二选一，见第九节）
npx wrangler login                      # 有浏览器
# 或
export CLOUDFLARE_API_TOKEN=xxxxx       # 无浏览器环境

npx wrangler pages deploy site --project-name xuesheng-monishi --branch main
```

部署完成后访问 https://xuesheng-monishi.pages.dev 验证：
- 返回 200，正文 sha256 = `2E593288…BD7C15`
- 首次访问（隐身窗口）弹出新手引导，点「我知道了」可关闭，点标题页「开始上学」能进课堂，左上角「?」可重开

注意：刚部署完边缘缓存可能还返回旧版本约 1 分钟。复测用带随机参数的 URL（`?cb=时间戳`）或部署别名
`https://<部署ID>.xuesheng-monishi.pages.dev/`，**不要因为抓到旧版本就判定部署失败**。

## 五、改代码后重新构建

必须先拿到 136 MB 基线（Releases 附件）。然后：

```bash
npm install                              # 仅为验证脚本装 playwright-core
export GESHIHUA_BAK=~/geshihua_v21_原始基线备份.html
export GESHIHUA_SRC=~/geshihua_v21_手机横屏优化.html
export GESHIHUA_OUT=./site

cp "$GESHIHUA_BAK" "$GESHIHUA_SRC"
node tools/patch_game.js                 # 6 个 swap 必须全部唯一命中，失败不写盘
NODE_OPTIONS=--max-old-space-size=6144 node tools/build_site.js
```

构建产物应与线上逐字节一致（除非你改了代码）。**改完必须重新验证再发布**（第七节）。

## 六、硬约束（违反会出事故）

1. **绝不直接编辑 136 MB 真源文件。** 所有改动写成 `tools/patch_game.js` 里的
   `swap(label, 原文, 新文)`；它要求锚点**唯一命中 1 次**，全部成功才写盘。
2. **锚点要用两行 `</body>\n</html>`。** 裸的 `</body>` 在源文件里实际出现 2 次（另一次在 JS 字符串字面量里）。
3. **不要改 `site/assets/2a88ebc74a2a/` 的目录名。** 它带一年 `immutable` 缓存；改名会让所有老访客重新下载 95 MB。
   只有 6 个内嵌资源本身变化时才允许变。
4. **部署前必须得到我明确确认。** 说清这次会改变什么、影响面多大。
5. **本仓库是公开的**：任何密码、API Token、OAuth 凭据都不得写入文件或提交记录。
6. **注意换行符**：仓库带 `.gitattributes`，`tools/*.js` 已固定 LF。如果你新增的文件含 `\n` 锚点，
   确保不要被转成 CRLF，否则补丁会锚点不匹配。

## 七、验证（每次改完必跑）

```bash
node tools/server.js 8788 &                    # 本地预览
CHROME_BIN=/usr/bin/google-chrome node tools/verify_local.cjs http://127.0.0.1:8788/
node tools/check_play.cjs  http://127.0.0.1:8788/
node tools/captain_accept.cjs http://127.0.0.1:8788/
```

| 脚本 | 验证什么 |
| --- | --- |
| `verify_local.cjs` | 6 个内嵌资源下载重组后 SHA-256 与 `expected.json` 逐字节一致 |
| `check_play.cjs` | 点「开始上学」能进课堂（`S.scene === 'class'`）、无报错 |
| `check_mobile.cjs` | 手机横屏 844×390 渲染正常、触屏按键齐全 |
| `check_drag.cjs` | 画面中央与两侧留白三处拖动都能转向 |
| `probe_aspect.cjs` | 2D 画布横纵缩放比 ≈ 1.000，画面不拉伸 |
| `captain_accept.cjs` | 新手引导全流程（首访弹出→关闭→进课堂→刷新不弹→「?」重开） |

**已知环境噪声**：软件渲染（swiftshader）下 Playwright 的 `click()` 握手会偶发超时，但点击往往已经生效
（例如超时那轮 `S.scene` 已变 `class`）。**判定一律用状态**（`S.scene` / `display` / `localStorage`），
不要只看 `click()` 是否抛异常；某轮失败时，先在未改动的旧版本上复跑对照再下结论。

## 八、当前已上线功能（不要重复实现）

1. 136 MB 单文件拆成网页版、按需加载（首页 HTML 约 1.7 MB brotli；教室模型 30 MB、电视视频 36 MB 进入场景才下载）
2. 手机横屏布局适配
3. 3D 第一人称身体：坐下低头能看到自己的大腿、小腿、鞋，以及上身（肩/胸/校服蓝条纹/肚子）和搭在课桌上的两条小臂
4. 像素风握笔手（替换掉原照片级矢量手）
5. 画面不拉伸：2D 像素画布按 16:9 等比居中，拖动判定区扩大到整个视图
6. 新手引导界面：首访整页弹出，关闭后写 `geshihua_guide_v1` 不再弹；左上角「?」可重看

## 九、账号与凭据

| 平台 | 账号 | 凭据如何获取 |
| --- | --- | --- |
| Cloudflare（部署用） | 邮箱 `3825020582@qq.com`，Account ID `f5c25fc39c68d8f51898d2af725f4762` | **密码 / API Token 由项目所有者私下提供**，不在本文件里 |
| GitHub（取代码用） | `duyuanxi` | 仓库公开，克隆不需要认证 |

**部署认证方式（二选一）：**

1. 有浏览器：`npx wrangler login` → 浏览器里登录 Cloudflare → 点 Allow。
2. 无浏览器（推荐服务器环境）：让项目所有者在 Cloudflare Dashboard 创建 API Token
   （权限：Account → **Cloudflare Pages : Edit**），然后在 shell 里：

   ```bash
   export CLOUDFLARE_API_TOKEN=你的token
   export CLOUDFLARE_ACCOUNT_ID=f5c25fc39c68d8f51898d2af725f4762
   npx wrangler pages deploy site --project-name xuesheng-monishi --branch main
   ```

> **绝对不要**把密码或 Token 写进仓库任何文件、提交记录、README、issue 或截图里。
> 需要留档就写在本地且不提交的位置。

## 十、已知取舍与坑（别重复踩）

- 引导遮罩是**"命中透明"**（遮罩与面板 `pointer-events:none`，只有按钮可点，点别处退场）。
  好处：首次访问时游戏仍完全可交互，也不会让既有自动化脚本点不到标题页按钮。
  若要改成硬模态，必须同时修改 `check_play.cjs` / `check_drag.cjs`。
- 「?」浮标被移入 `#game` 容器（该容器子节点 18→19），这是它跟随游戏窗口、按容器坐标避让虚拟键的必要条件。
- 拆分版必须通过网址打开；直接双击 `site/index.html` 会因浏览器安全策略加载不了模型（CORS/file://）。
- 136 MB 的原始单文件版本仍可离线运行，是给用户的兜底。

## 十一、第一步（做完汇报，先别改任何代码）

1. `git clone` 仓库，读 `README.md` 与 `部署说明.md`，确认你理解"基线 → 补丁 → 构建 → 部署"这条链。
2. 核对 `site/index.html` 的 sha256 是否等于 `2E59328820AC534BAA0B125FC8FA37FF8CD01C94044554CC07D8E0ECE0BD7C15`。
3. 本地起 `node tools/server.js 8788`，在浏览器里亲自过一遍：标题页 → 新手引导 → 开始上学 → 课堂 → 拖动转向 → 低头看身子。
4. 跑 `verify_local.cjs` 与 `check_play.cjs`（针对 `http://127.0.0.1:8788/`），记录结果。
5. 向我汇报：基线状态、你的理解、环境是否就绪（Node 版本、浏览器路径、wrangler 认证方式打算用哪种）。
   **在得到我确认前不要改任何文件、不要部署。**

## 十二、工作方式要求

- 每次改动前说明：要改什么、为什么、影响面多大。
- 每次改完给证据：命令、输出、截图、哈希，不要只说"应该没问题"。
- 声称"没有改动其他内容"时，必须用 diff 或哈希证明。
- 破坏性操作（删除、重命名、重新部署）前必须确认。
- 遇到"看起来是回归"的现象，先做对照实验（在未改动的旧版本上复现）再下结论。
