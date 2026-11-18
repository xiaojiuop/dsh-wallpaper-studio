## Add `dsh-wallpaper-studio` (theme)

One file: `data/plugins/<owner>__dsh-wallpaper-studio.yml`. No README edits.

- Repo: https://github.com/<owner>/dsh-wallpaper-studio
- npm: `dsh-wallpaper-studio@<version>` (prebuilt — no `allowBuilds` approval needed)
- Release asset: `dsh-wallpaper-studio.tgz` (version-free name, so `releases/latest/download/` keeps working)

### What it does

A client-only bundle that paints an image / video / direct URL / 6 built-in gradients behind the whole
DSH interface (fill, fit, tile), then overrides the primary, canvas and panel design tokens — separate
light and dark values — and sets independent opacity for panels, inputs and popovers. Media is stored in
the browser's IndexedDB; nothing is uploaded and no external endpoint is contacted.

- `dsh.bundle.patch` → `./cordis.patch.yml` ✓ (not a `dsh.client`-only package)
- `category: theme` ✓
- `dsh-plugin` topic set ✓
- Repo older than 1 day at submission time ✓

### Checklist

- [x] I added **one file** at `data/plugins/<owner>__dsh-wallpaper-studio.yml` — that single file is the whole submission
- [x] My repo's `package.json` declares **`dsh.bundle`** (not just `dsh.client`)
- [x] My repo is at least **1 day old**
- [x] `category` is one of the allowed values, and themes/skins go under `theme`
- [x] Description states what the plugin does, no superlatives
- [x] My repo has the `dsh-plugin` topic

### Recommended extras, already done

- [x] Published to npm (prebuilt `lib/client.js` is committed, so installing runs no build)
- [x] No official `@deepseek-ai/*` package is declared as a dependency — the browser half resolves
      `react` from the platform's shared module table and imports no `@deepseek-ai/*` value
- [x] `assets/icon-180.png` in the repo for the storefront card
