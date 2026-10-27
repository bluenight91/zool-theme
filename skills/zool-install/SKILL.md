---
name: zool-install
description: Install, upgrade or roll back the ZOOL theme on a Nezha status panel from 设置 → 前端管理. Use when asked to install zool / ZOOL theme on Nezha.
---

# ZOOL theme installation

Install the latest ZOOL release on a Nezha dashboard that can install user frontends from a public Git repository. Replace angle-bracket placeholders with confirmed values before running commands. Stop on any failed step.

## Before you start

- Confirm the panel URL and the requested version with the user first. Reuse authorized access; never guess credentials or request unnecessary secrets.
- The install itself happens in **设置 → 前端管理 → 用户前端**. Do not mount a directory over the dashboard or edit `user_template` by hand when that page is available.
- Confirm with the user before enabling a frontend or switching away from the one visitors are using. Say which release will be enabled and that the previous choice can be turned back on from the same page.
- Checking the release needs curl, jq and sha256sum. Inspecting the zip also needs unzip.

## Detect

```bash
curl -s 'https://<host>/api/v1/setting'
```

A JSON body with `success: true` identifies Nezha. HTML, errors or any other shape is not a positive detection. Stop if it is not Nezha. The dashboard must include **设置 → 前端管理**; an older panel that only has a template dropdown cannot install `dist.zip`.

## Download and verify

Fetch release metadata once. Do not use unbounded retries. Resolve the asset URL from the API. If the API answers 403 with "rate limit exceeded", repeat the metadata request once with `-H "Authorization: Bearer $GITHUB_TOKEN"` when a token is available; otherwise report the limit and its reset time.

```bash
set -euo pipefail
curl -fsSL 'https://api.github.com/repos/foru17/zool-theme/releases/latest' -o release.json
tag=$(jq -er '.tag_name' release.json)
jq -er '
  [.assets[] | select(.name == "dist.zip")]
  | if length == 1 then .[0] else error("Expected exactly one dist.zip asset") end
  | {url: .browser_download_url, digest: .digest, draft: .draft}
' release.json > asset.json
```

Stop if `draft` is true, if `digest` is missing or not `sha256:` plus 64 hex characters, or if the user asked for a different tag than `$tag`.

```bash
url=$(jq -er .url asset.json)
curl -fL "$url" -o dist.zip
jq -er '.digest | sub("^sha256:"; "")' asset.json | awk '{ print $0 "  dist.zip" }' | sha256sum -c
unzip -Z1 dist.zip > listing.txt
```

Reject the zip unless every listing entry is `dist` or starts with `dist/`, none contain `..`, and `dist/index.html` is present. `unzip -l dist.zip` must show a nonzero size for `dist/index.html`. Do not upload this copy to the panel; the panel downloads the same asset itself.

## Install

Tell the user to do this in the admin panel, and wait until they confirm each step:

1. **设置 → 前端管理 → 用户前端**
2. Repository: `https://github.com/foru17/zool-theme`
3. Install tag `$tag` (the asset is `dist.zip`)
4. **启用** that version

Do not restart the dashboard. Do not change `data/config.yaml`.

## Verify

```bash
curl -s 'https://<host>/' | grep -o 'generator" content="zool v[0-9.]*'
```

The version must match `$tag` without the leading `v`. Open the homepage, confirm it renders, and hard-refresh once. If browser access is unavailable, ask the user to do this and report it as pending, not verified.

## Roll back

In **设置 → 前端管理 → 用户前端**, enable the frontend that was active before (the built-in one is `user-dist`). Confirm the generator meta no longer reports the ZOOL version you just installed, or that it reports the version you returned to.

## Custom code

Panel name, logo and description are not files in the zip. They go in **设置 → 自定义代码** for the user frontend:

```html
<script>
  window.ZoolConfig = { siteTitle: "我的面板" };
  window.CustomLogo = "https://example.com/logo.png";
  window.CustomDesc = "一行描述";
  window.DisableAnimatedMan = "true";
  window.ShowNetTransfer = "true";
  window.ForceTheme = "dark";
</script>
<style>
  [data-zool="wordmark"] { display: none; }
</style>
```

- `siteTitle` replaces the site name in the header and the document title. Assigning `window.ZoolConfig = { siteTitle }` overrides only those keys; keys left out stay as `config.js` set them.
- `CustomLogo` must be an `http` or `https` URL. A broken image falls back to the title alone.
- `CustomDesc` is one line under the home-page title.
- `ForceTheme` is `light` or `dark`.
- `DisableAnimatedMan` set to true, or the style above, hides the footer wordmark.
- `ShowNetTransfer` set to false hides cumulative transfer. Live rates stay. `"true"` and `"false"` are accepted.

Other `window.ZoolConfig` keys are in the theme README. Custom code runs after `config.js` and wins.

## Report

Tell the user the installed tag, the verification result (including any pending browser check), and the rollback step: re-enable the previous frontend from **前端管理**. Never report success only because the zip downloaded.
