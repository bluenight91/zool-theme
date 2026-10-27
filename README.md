<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="docs/brand/zool-wordmark-white.svg" />
    <img src="docs/brand/zool-wordmark-ink.svg" alt="ZOOL" width="168" />
  </picture>
</p>

<p align="center">
  A calm status page for <a href="https://github.com/nezhahq/nezha">Nezha</a>.<br />
  <sub>A fork of <a href="https://github.com/foru17/zool-theme">foru17/zool-theme</a>, kept for <a href="https://github.com/bluenight91/zool-theme">this repository</a>.</sub>
</p>

<p align="center">
  <a href="https://github.com/bluenight91/zool-theme/releases/latest"><img alt="Release" src="https://img.shields.io/github/v/release/bluenight91/zool-theme?style=flat-square&color=191B1A&label=release" /></a>
  <a href="LICENSE"><img alt="License" src="https://img.shields.io/badge/license-MIT-53695A?style=flat-square" /></a>
</p>

<p align="center">
  English · <a href="README.zh-CN.md">简体中文</a>
</p>

<p align="center">
  <img src="docs/screenshots/home-light.png" alt="ZOOL in light mode" width="880" />
</p>

## Install

Nezha installs this theme from **设置 → 前端管理 → 用户前端**.

1. Enter `https://github.com/bluenight91/zool-theme`.
2. Install a release. The asset is `dist.zip`: public, not a draft, every file under `dist/`, with a nonempty `dist/index.html`.
3. Click **启用**. The next request uses this theme. No panel restart.

To go back, enable another frontend in the same list. The built-in one is `user-dist`. Nezha keeps each installed tag, so a new release is a new row. Details, billing notes and a panel that cannot reach GitHub: [docs/install-nezha.md](docs/install-nezha.md).

An agent that can open the panel can follow [`skills/zool-install`](skills/zool-install). It asks before enabling a frontend and does not delete an installed copy.

## What you get

- **Home.** Online nodes, bandwidth, traffic, what needs attention, and monthly cost when a server's public note carries billing data. Cards or a ledger, flat or grouped, filtered by group and region.
- **Readings.** CPU, memory and disk as cells. Upload above a baseline and download below it. A node that drops keeps its last readings and says when it last reported.
- **Node page.** Three choices: **详情** (load charts), **网络** (latency), **在线** (online time). Latency starts with every monitor; click a name to keep that one, and click more to compare them. Online time shows the rate, totals, a 0–24 bar for each day, and online or offline periods. Signed-out visitors stay on 1 day.
- **Sign-in.** The home page lists the password form and every OAuth provider the panel has configured. GitHub finishes on Nezha's own `/dashboard/login`.
- **Languages and appearance.** English, 简体中文, 繁體中文, 日本語. Light, dark, or the system. Fonts, flags and icons ship with the theme.

## Customize

**设置 → 自定义代码**, on the user frontend, runs before the page reads its settings. A `<style>` block applies as CSS. A `<script>` block runs, and the globals below are read afterwards. `"true"` and `"false"` count as booleans.

`dist/config.js` ships the same `window.ZoolConfig` keys, commented out. Custom code runs after that file. Assigning `window.ZoolConfig = { siteTitle: "…" }` overrides only the keys in that object; anything left out stays as `config.js` left it. Prefer the custom-code box: the next install replaces `dist/`.

### `window` globals

| Global | Effect |
| --- | --- |
| `window.CustomLogo` | Image before the site title. Only `http:` and `https:` URLs are used; a broken image falls back to the title |
| `window.CustomDesc` | One line under the home-page title |
| `window.ForceTheme` | `"light"` or `"dark"`. The visitor's own choice still wins after they pick one |
| `window.DisableAnimatedMan` | `true` hides the footer wordmark. The element stays at `[data-zool="wordmark"]` |
| `window.ShowNetTransfer` | Cumulative transfer stays visible unless this is `false`. Live rates stay either way |

`window.ZoolConfig.logo`, `hideWordmark` and `showNetTransfer` are the same three settings. When both are set, the `window` global wins.

### `window.ZoolConfig`

| Key | Default | Effect |
| --- | --- | --- |
| `siteTitle` | *(empty)* | Site name in the header and the browser title. Empty keeps the name from the panel |
| `defaultAppearance` | `system` | `system`, `light` or `dark`, until a visitor picks one |
| `defaultView` | `ledger` | `ledger` or `cards` |
| `defaultDensity` | `comfortable` | Ledger row height: `comfortable` or `compact`. Cards ignore it |
| `defaultLanguage` | `auto` | `auto`, `en`, `zh-CN`, `zh-TW` or `ja` |
| `showOverview` | `true` | Overview band on the home page |
| `showCost` | `true` | Monthly cost, summed per currency and normalised to 30 days. Needs billing data in the public note |
| `showGroups` | `true` | Group filter. `false` also stops grouping the list |
| `defaultGrouped` | `false` | Start with the list sectioned by group |
| `showRegions` | `true` | Region filter |
| `showBilling` | `true` | Price and expiry on cards |
| `showOffline` | `true` | List nodes that are not reporting |
| `showNetTransfer` | `true` | Cumulative transfer. Live rates stay |
| `hiddenNodes` | `[]` | Server ids hidden from the home page, search and the node switcher, for example `["12", "13"]` |
| `hideAdminEntry` | `false` | Hide the sign-in button |
| `loginMode` | `both` | See below |
| `hideWordmark` | `false` | Hide the footer wordmark |
| `footerNote` | *(empty)* | One line above the credit |
| `logo` | *(empty)* | Same role as `window.CustomLogo` |

`loginMode`:

| Value | Sign-in |
| --- | --- |
| `both` | Password form, and a button for each OAuth provider the panel has configured. No providers means the password form only |
| `password` | Username and password only |
| `oauth` | Configured providers only. If none are configured, the password form stays |
| `dashboard` | The home-page button opens `/dashboard/login` |

The password block is `[data-zool-login="password"]`. The provider block is `[data-zool-login="oauth"]`. Hiding one of those with CSS does not remove the other. Class names from other themes, such as `.pb-4`, do not match anything here.

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

Price, cycle and traffic quota are not panel fields. Put them in the server's public note as JSON. The shape is in [docs/install-nezha.md](docs/install-nezha.md#billing-data).

## Develop

Node.js 22 or newer, and pnpm.

```bash
pnpm install
pnpm dev:demo          # synthetic fleet
pnpm dev               # proxies /api to ZOOL_UPSTREAM, or demo data when that is unset
pnpm check             # types, tests, i18n
pnpm build && pnpm check:size && pnpm package
```

`pnpm package` writes `release/dist.zip`. A `v*` tag whose name matches `package.json` publishes that zip. The release title is `ZOOL`, which is the name Nezha shows beside the tag.

Layout of the code: [docs/architecture.md](docs/architecture.md). How the home-page instruments are drawn: [docs/instruments.md](docs/instruments.md).

## Credits

This repository is a fork of [foru17/zool-theme](https://github.com/foru17/zool-theme) by ZOOL LLC. The theme still talks to [Nezha](https://github.com/nezhahq/nezha). Maintained here by [@luoleiorg](https://x.com/luoleiorg).

Typeface [Inter](https://rsms.me/inter/) (SIL OFL). UI icons [Lucide](https://lucide.dev) (ISC). Flags [flag-icons](https://github.com/lipis/flag-icons) (MIT). System icons [Simple Icons](https://simpleicons.org) (CC0). Those marks belong to their owners. Tile colours come from Simple Icons metadata. The Windows shape is drawn for this project.

## License

[MIT](LICENSE), the same license as the original repository. The copyright notice in that file stays with the work.

The ZOOL name and logo are trademarks of ZOOL LLC and are not covered by the MIT license. This fork keeps the attribution and does not present itself as an official ZOOL product.
