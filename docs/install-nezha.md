# Installing on Nezha

ZOOL is a user frontend for the Nezha dashboard. Install it from **设置 → 前端管理** on a dashboard that can install frontend releases at runtime (the feature added in [nezhahq/nezha@891d639](https://github.com/nezhahq/nezha/commit/891d63920d421111c4e27ed6dad32d7497d1a56f)).

Nezha only serves this frontend for `/` and `/server/:id`, which is what the theme uses. Assets are rooted at `/`.

## From the admin panel

1. Open **设置 → 前端管理** and choose **用户前端**.
2. Enter the repository `https://github.com/foru17/zool-theme`.
3. Install a release. The release must be public, not a draft, and must contain an asset named exactly `dist.zip`. Inside that zip every file lives under `dist/`, including a nonempty `dist/index.html`.
4. Click **启用**. The next request uses ZOOL. No panel restart.

`curl -s https://your-nezha/ | grep -o 'generator" content="zool v[0-9.]*'` prints the installed version.

To go back, enable the previous frontend in the same list (the built-in one is `user-dist`).

## Custom code

**设置 → 自定义代码**, on the user frontend, is injected before the page reads its settings. A `<style>` block applies as CSS. A `<script>` block runs, and these globals are read afterwards. `"true"` and `"false"` count as booleans.

| Global | Effect |
| --- | --- |
| `window.ZoolConfig.siteTitle` | Replaces the site name in the header and the browser title |
| `window.CustomLogo` | Image before the title. Only `http:` and `https:` URLs are used |
| `window.CustomDesc` | One line under the home-page title |
| `window.ForceTheme` | `"light"` or `"dark"`, the default appearance until a visitor picks one |
| `window.DisableAnimatedMan` | Hides the footer wordmark when true |
| `window.ShowNetTransfer` | Cumulative transfer stays visible unless this is false |

The same `<style>` block can target the wordmark with `[data-zool="wordmark"]`. Class names from other themes, such as `.pb-4`, do not match anything here.

```html
<script>
  window.ZoolConfig = { siteTitle: "我的面板" };
  window.CustomLogo = "https://example.com/logo.png";
  window.CustomDesc = "醉后不知天在水，满船清梦压星河。";
  window.DisableAnimatedMan = "true";
</script>
<style>
  [data-zool="wordmark"] { display: none; }
</style>
```

`dist/config.js` still ships the same `window.ZoolConfig` keys, commented out. Custom code runs after that file. Assigning `window.ZoolConfig = { siteTitle: "…" }` overrides only the keys in that object; anything left out stays as `config.js` set it. On a frontend installed by the panel, prefer the custom-code box: the installed files are replaced as a unit, so edits inside `dist/` do not survive the next install.

The other keys (`defaultView`, `showOverview`, `footerNote`, and the rest) are listed in the [README](../README.md#settings).

## Billing data

Nezha has no billing fields, so the theme reads the server's **public note** (Servers → edit → Public note)
when it contains JSON in the format used by nezha-dash and Nazhua:

```json
{
  "billingDataMod": {
    "startDate": "2026-01-01T00:00:00+08:00",
    "endDate": "2027-01-01T00:00:00+08:00",
    "autoRenewal": "1",
    "cycle": "Year",
    "amount": "$36"
  },
  "planDataMod": {
    "trafficVol": "2TB",
    "trafficType": "2"
  }
}
```

- `cycle`: `Month`, `Quarter`, `Half`, `Year` (or 月 / 季 / 半年 / 年).
- `amount`: a number with an optional currency prefix; `0` or `free` means free.
- `trafficType`: `2` counts upload + download against `trafficVol`, anything else counts the larger of the two.

Plain-text notes are ignored.

## History and latency

Nezha keeps no metric history unless its TSDB is enabled, so node charts show a live buffer that fills
while the page is open. The latency tab shows the last 24 hours of the dashboard's service monitors for that server.

## Sign-in

The sign-in dialog posts to `/api/v1/login` and then opens `/dashboard`. Nezha blocks an IP for a while
after repeated failures; the dialog says so.

## If the panel cannot reach GitHub

Download `dist.zip` from the [releases page](https://github.com/foru17/zool-theme/releases/latest) and unzip it so `index.html` lands in the template directory the dashboard is serving (often `user-dist` in the dashboard's working directory). That directory is the *contents* of `dist/`, not a folder named `dist` beside the binary. Restart only if the process does not already read that directory from disk.

When copying an upgrade over an existing directory, leave the previous `assets/` files in place. `index.html` is served without `Cache-Control`, so a browser may still hold the previous HTML; if its hashed files are gone, the page stays blank.
