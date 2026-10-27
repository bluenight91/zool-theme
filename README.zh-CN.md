<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="docs/brand/zool-wordmark-white.svg" />
    <img src="docs/brand/zool-wordmark-ink.svg" alt="ZOOL" width="168" />
  </picture>
</p>

<p align="center">
  为 <a href="https://github.com/nezhahq/nezha">哪吒监控</a> 打造的安静的状态页。<br />
  <sub>派生自 <a href="https://github.com/foru17/zool-theme">foru17/zool-theme</a>，由 <a href="https://github.com/bluenight91/zool-theme">这个仓库</a> 继续维护。</sub>
</p>

<p align="center">
  <a href="https://github.com/bluenight91/zool-theme/releases/latest"><img alt="Release" src="https://img.shields.io/github/v/release/bluenight91/zool-theme?style=flat-square&color=191B1A&label=release" /></a>
  <a href="LICENSE"><img alt="License" src="https://img.shields.io/badge/license-MIT-53695A?style=flat-square" /></a>
</p>

<p align="center">
  <a href="README.md">English</a> · 简体中文
</p>

<p align="center">
  <img src="docs/screenshots/home-light.png" alt="ZOOL 主题浅色模式" width="880" />
</p>

## 安装

哪吒从 **设置 → 前端管理 → 用户前端** 安装这个主题。

1. 填入 `https://github.com/bluenight91/zool-theme`。
2. 安装一个发布版本。附件必须是 `dist.zip`：公开、不是草稿，所有文件都在 `dist/` 下，并且有非空的 `dist/index.html`。
3. 点 **启用**。下一次请求就会用这个主题，面板不用重启。

要换回去，在同一列表里启用另一个前端。内置的是 `user-dist`。哪吒会保留每一个已安装的标签，所以新版本是新的一行。计费备注、面板访问不了 GitHub 时的做法，见 [docs/install-nezha.md](docs/install-nezha.md)。

能打开面板的代理可以按 [`skills/zool-install`](skills/zool-install) 来装。启用前会先问，也不会删掉已经装上的副本。

## 你会得到

- **首页。** 在线节点、带宽、流量、需要注意的机器；服务器公开备注里有计费数据时，还有月度成本。卡片或台账，平铺或分组，按分组和地区筛选。
- **读数。** CPU、内存、磁盘用格子表示。上传在基线以上，下载在基线以下。掉线的节点保留最后读数，并写明最后上报时间。
- **节点页。** 三项：**详情**（负载图表）、**网络**（延迟）、**在线**（在线时间）。延迟默认画出全部监控，点一个名称只留这一条，再点就加进对比。在线时间有在线率、累计时长、每天一条 0–24 小时的条，以及在线或离线时间段。未登录只能看 1 天。
- **登录。** 首页列出密码，以及面板已经配置的每一个 OAuth 提供方。GitHub 登录完成后仍回到哪吒自己的 `/dashboard/login`。
- **语言和外观。** English、简体中文、繁體中文、日本語。浅色、深色或跟随系统。字体、国旗和图标随主题一起分发。

## 自定义

**设置 → 自定义代码** 里的用户前端代码，会在页面读取设置之前执行。`<style>` 作为样式生效。`<script>` 会运行，然后读取下面这些全局变量。`"true"` 和 `"false"` 算布尔值。

`dist/config.js` 里有同样的 `window.ZoolConfig` 键，默认注释掉。自定义代码在这个文件之后运行。写成 `window.ZoolConfig = { siteTitle: "…" }` 时，只覆盖对象里写了的键，没写的键保持 `config.js` 里的值。下次安装会整份替换 `dist/`，所以改已安装的文件留不住，用自定义代码这一栏。

### `window` 全局变量

| 变量 | 作用 |
| --- | --- |
| `window.CustomLogo` | 标题前的图片。只接受 `http:` 和 `https:`。图片打不开时回到标题 |
| `window.CustomDesc` | 首页标题下的一行字 |
| `window.ForceTheme` | `"light"` 或 `"dark"`。访客自己选过外观之后，以访客的选择为准 |
| `window.DisableAnimatedMan` | `true` 时隐藏页脚的大字标。元素还在，选择器是 `[data-zool="wordmark"]` |
| `window.ShowNetTransfer` | 不是 `false` 时保留累计流量。实时速率两种情况都在 |

`window.ZoolConfig` 里的 `logo`、`hideWordmark`、`showNetTransfer` 是同样的三项。两边都写了的时候，以这里的 `window` 变量为准。

### `window.ZoolConfig`

| 键 | 默认 | 作用 |
| --- | --- | --- |
| `siteTitle` | *（空）* | 页眉和浏览器标题里的站点名。空着就用面板里的名字 |
| `defaultAppearance` | `system` | `system`、`light` 或 `dark`，直到访客自己选 |
| `defaultView` | `ledger` | `ledger` 或 `cards` |
| `defaultDensity` | `comfortable` | 台账行高：`comfortable` 或 `compact`。卡片视图不用它 |
| `defaultLanguage` | `auto` | `auto`、`en`、`zh-CN`、`zh-TW` 或 `ja` |
| `showOverview` | `true` | 首页总览 |
| `showCost` | `true` | 月度成本，按币种汇总并折成 30 天。公开备注里要有计费数据 |
| `showGroups` | `true` | 分组筛选。`false` 时也不再按分组分段 |
| `defaultGrouped` | `false` | 一开始就按分组展示 |
| `showRegions` | `true` | 地区筛选 |
| `showBilling` | `true` | 卡片上的价格和到期时间 |
| `showOffline` | `true` | 列出没有在上报的节点 |
| `showNetTransfer` | `true` | 累计流量。实时速率仍在 |
| `hiddenNodes` | `[]` | 从首页、搜索和节点切换里隐藏的服务器 id，例如 `["12", "13"]` |
| `hideAdminEntry` | `false` | 隐藏登录按钮 |
| `loginMode` | `both` | 见下表 |
| `hideWordmark` | `false` | 隐藏页脚大字标 |
| `footerNote` | *（空）* | 署名上面的一行字 |
| `logo` | *（空）* | 和 `window.CustomLogo` 同一件事 |

`loginMode`：

| 值 | 登录 |
| --- | --- |
| `both` | 密码，再加上面板已配置的每一个 OAuth 提供方。没有提供方时只显示密码 |
| `password` | 只显示用户名和密码 |
| `oauth` | 只显示已配置的提供方。一个都没有时仍显示密码 |
| `dashboard` | 首页的登录按钮打开 `/dashboard/login` |

密码区是 `[data-zool-login="password"]`，提供方区是 `[data-zool-login="oauth"]`。用样式藏起一块，另一块还在。其它主题的类名，例如 `.pb-4`，在这里对不上任何元素。

```html
<script>
  window.ZoolConfig = {
    siteTitle: "我的面板",
    loginMode: "both"
  };
  window.CustomLogo = "https://example.com/logo.png";
  window.CustomDesc = "醉后不知天在水，满船清梦压星河。";
  window.ForceTheme = "light";
  window.DisableAnimatedMan = "false";
  window.ShowNetTransfer = "true";
</script>
<style>
  [data-zool="wordmark"] { display: none; }
</style>
```

价格、周期和流量配额不是面板字段。写在服务器的公开备注里，用 JSON。格式见 [docs/install-nezha.md](docs/install-nezha.md#billing-data)。

## 开发

需要 Node.js 22 或更新版本，以及 pnpm。

```bash
pnpm install
pnpm dev:demo          # 合成数据
pnpm dev               # 把 /api 代理到 ZOOL_UPSTREAM；没设置时用合成数据
pnpm check             # 类型、测试、文案
pnpm build && pnpm check:size && pnpm package
```

`pnpm package` 写出 `release/dist.zip`。和 `package.json` 版本一致的 `v*` 标签会发布这个压缩包。发布标题是 `ZOOL`，哪吒就用这个名字显示在标签旁边。

代码怎么分： [docs/architecture.md](docs/architecture.md)。首页上的格子和速率线怎么画： [docs/instruments.md](docs/instruments.md)。

## 致谢

这个仓库派生自 ZOOL LLC 的 [foru17/zool-theme](https://github.com/foru17/zool-theme)。主题对接的是 [哪吒监控](https://github.com/nezhahq/nezha)。这里由 [@luoleiorg](https://x.com/luoleiorg) 维护。

字体 [Inter](https://rsms.me/inter/)（SIL OFL）。界面图标 [Lucide](https://lucide.dev)（ISC）。国旗 [flag-icons](https://github.com/lipis/flag-icons)（MIT）。系统图标 [Simple Icons](https://simpleicons.org)（CC0）。这些标志属于各自的权利人。色块颜色来自 Simple Icons 登记的品牌色。Windows 的图形是这个项目自己画的。

## 许可

[MIT](LICENSE)，与原仓库相同。许可证文件里的版权声明随作品保留。

ZOOL 这个名字和标志是 ZOOL LLC 的商标，不在 MIT 许可之内。这个派生仓库保留署名，并不把自己说成 ZOOL 的官方产品。
