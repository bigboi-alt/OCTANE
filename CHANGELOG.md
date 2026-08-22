# Changelog

All notable changes to OCTANE are documented here.
The format is based on [Keep a Changelog](https://keepachangelog.com/).

## [0.4.3] — 2026-08-22

### Changed
- **Rebranded to OCTANE** (was TROOP). Logo (chevron mark) unchanged.

### Fixed
- **Dashboard backgrounds + effects now work.** Wallpapers and ambient
  effects (e.g. Cosmos twinkling stars) now show on the dashboard and other
  non-repository pages too — the wallpaper is dimmed with a readability
  floor (55%) so text stays readable while the effect is visible.

## [0.4.2] — 2026-08-22

### Changed
- **New logo** — replaced the ASCII-art logo with a clean geometric mark:
  three ascending chevrons ("squad" / rank motif) in white on a black
  rounded tile. Used for the extension icon, the popup header and the demo.
- Removed the old `assets/logo-source.png` and its base64 payload from the
  demo (much smaller, faster-loading demo).

## [0.4.1] — 2026-08-22

### Added
- **Real ASCII-art logo** — the extension now uses your artwork as its logo:
  the popup header, the README, the live demo and the extension icons are all
  generated from it (`assets/logo-source.png`). Icons are high-contrast
  gold-on-black (dilated strokes) so they stay readable at 16px.
- `tools/make_assets.py` and `tools/make_demo.py` now rebuild the logo and
  icons from the source artwork, so they're fully reproducible.

## [0.4.0] — 2026-08-22

### Changed
- **Rebranded to OCTANE** (was OctoTune): name, popup, icons, README, demo.
- **Popup redesigned in black** — monochrome dark UI (black surfaces, white
  accent) instead of the blue palette.
- **Dashboard background fixed** — wallpapers now only show through on
  repository pages; the dashboard/feed stays solid so nothing bleeds through.

### Added
- **"Hide horizontal scrollbars"** toggle in the Custom tab (removes the
  sideways scrollbar in code & tables; still scrollable via trackpad /
  Shift + wheel).
- **Crash-proofing** — all entry points (apply, storage listener, keyboard
  shortcut) are wrapped in guards so a GitHub change can never throw and kill
  the extension.

## [0.3.0] — 2026-08-22

### Added
- **Cosmos theme** — a "hollow"/glassy deep-space theme whose translucent
  surfaces let your wallpaper glow through, with twinkling stars.
- **Ambient theme effects** — falling Sakura petals, twinkling Cosmos stars,
  and rising embers for Nocturne & Kin-Beni (toggleable; off by default when
  the tab is hidden to save CPU).
- **Glassy navbar** — the top navigation becomes frosted glass
  (backdrop blur + translucency) whenever a background is active.
- **Focus indicator pill** — shows how many elements Focus hid, and clicking
  it exits Focus.
- **Ctrl/Cmd + Shift + F** — toggles Focus mode from anywhere.

### Changed
- **Custom themes now apply live.** Editing any color (or the base) switches
  to the custom theme immediately — the broken two-step flow is gone.
- Settings are deep-merged on load, so partial/legacy `bg`/`custom` data can
  never leave the UI broken.
- **Gentle** hides promos + Releases/Packages/Deployments and *dims* (instead
  of deleting) stars, forks and sidebar metadata.
- **Focus** hides social & popularity metrics, discovery links and the last
  commit row, keeps Code/files/README and the About box (profile picture),
  and mutes Contributors instead of removing them.

## [0.2.2] — 2026-08-22

### Fixed
- **Backgrounds now show through.** When a wallpaper (image / gradient /
  color) is active, the page containers are made transparent instead of being
  painted with the theme color, so the background is visible around GitHub's
  cards (which stay solid).
- **Simplify rewritten for GitHub's new DOM.** GitHub replaced `.Layout`,
  `.Layout-sidebar` and `.BorderGrid-row` with `prc-PageLayout-*` and
  `SidebarSection-module__*` classes. Section hiding now targets the new
  headings/boxes (with old-DOM fallbacks), and repo tabs are matched via
  `data-tab-item` / `UnderlineNav-item`.
- **Focus mode keeps the profile picture / About box.** Focus now hides only
  jargon sections (Releases, Packages, Deployments, Languages, Used by,
  Milestones) plus all tabs except Code — it no longer collapses the layout
  or removes the About section, so nothing looks broken.
- **Gentle mode is less aggressive** — only Insights/Settings tabs and
  Releases/Packages/Deployments sections.
- **Custom themes fixed** (they were victims of the same CSS cascade bug) and
  the popup now guards against missing custom colors.
- Themed GitHub's current header tokens (`--page-header-bgColor`,
  `--color-page-header-bg`) and page-canvas token (`--bgColor-canvas`).

## [0.2.1] — 2026-08-21

### Fixed
- **Themes now fully apply.** Injected CSS variables use `!important` plus
  hard element-level fallbacks, so GitHub's own theme CSS can no longer win
  the cascade (dark themes previously stayed unchanged).
- **Simplify mode now works.** The content script re-applies via a
  MutationObserver as GitHub renders its SPA (it previously ran once before
  the UI existed). Tab matching now uses label text, not URLs, and focus mode
  forces a full-width layout via CSS.
- **Tips banner is independent** of Simplify — it now also shows when
  Simplify is set to *Off*.
- Added `--header-fgColor-default` and `--fgColor-link` aliases for GitHub's
  current token names.

## [0.2.0] — 2026-08-21

### Added
- **Custom backgrounds**: image (upload or URL), gradient (2 colors + angle +
  6 presets), and solid color — with a fade slider for readability.
- **Custom color-scheme builder**: pick a light/dark base and any page
  background, cards, text, muted text, borders, accent, primary button and
  header color; unset values are derived automatically.
- **Kin-Beni** theme — Japanese vermilion red & gold on sumi-ink black
  (palette matched to a reference image).
- Redesigned popup: dark-chrome UI with **Theme / Background / Custom** tabs,
  preset chips, live previews and a toast.
- `unlimitedStorage` permission for local wallpapers.
- Live demo now includes backgrounds and the custom builder.
- `CHANGELOG.md`.

## [0.1.0] — 2026-08-21

### Added
- 8 CSS-variable themes (light + dark) with legacy `--color-*` aliases.
- Accent color override with automatic contrast.
- Simplify modes (gentle / focus) for newcomers.
- Optional new-user tips banner.
- MV3 popup UI and SPA-aware content script.
- Icons, theme preview image, self-contained demo, MIT license.
