#!/usr/bin/env python3
"""
Builds docs/demo.html — a fully self-contained, dependency-free demo that
mimics the OCTANE popup + a fake GitHub page, so the extension can be
previewed in any browser (or the workspace file viewer) without loading it.

The real shared/themes.js is inlined, so the demo never drifts from the
actual extension (themes, custom builder, gradient presets).
"""
import os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

TEMPLATE = r"""<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>OCTANE — live demo</title>
<style>
  :root {
    --chrome-bg: #0d1117;
    --chrome-fg: #e6edf3;
    --chrome-muted: #8b949e;
    --chrome-line: #30363d;
    --chrome-surface: #161b22;
    --accent: #5b7cfa;
  }
  * { box-sizing: border-box; }
  body {
    margin: 0;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "Noto Sans",
      Helvetica, Arial, sans-serif;
    font-size: 14px;
    color: var(--chrome-fg);
    background: var(--chrome-bg);
  }

  /* ---------------- control panel ---------------- */
  .panel {
    position: sticky; top: 0; z-index: 50;
    background: var(--chrome-bg);
    border-bottom: 1px solid #21262d;
    padding: 14px 20px 16px;
    display: grid; grid-template-columns: 1fr 1fr; gap: 22px; align-items: start;
  }
  .brand { display: flex; gap: 10px; align-items: center; grid-column: 1 / -1; }
  .brand svg { width: 36px; height: 36px; flex: none; }
  .brand img { height: 54px; width: auto; flex: none; }
  .brand h1 { font-size: 16px; margin: 0; }
  .brand h1 small { display: block; font-weight: 400; color: var(--chrome-muted); font-size: 12px; margin-top: 2px; }
  .col { display: flex; flex-direction: column; gap: 16px; }
  .control { display: flex; flex-direction: column; gap: 7px; }
  .control > label {
    font-size: 10.5px; font-weight: 700; letter-spacing: .6px; text-transform: uppercase;
    color: var(--chrome-muted);
  }
  .themes { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
  .theme-card {
    display: flex; gap: 7px; align-items: center; padding: 6px 9px 6px 6px;
    background: var(--chrome-surface); border: 1px solid var(--chrome-line); border-radius: 8px;
    cursor: pointer; color: var(--chrome-fg); font: inherit; font-size: 12px; font-weight: 600;
    text-align: left;
  }
  .theme-card:hover { border-color: #6e7681; }
  .theme-card.on { border-color: var(--accent); box-shadow: 0 0 0 1px var(--accent); }
  .sw { display: flex; border-radius: 5px; overflow: hidden; border: 1px solid var(--chrome-line); flex: none; }
  .sw i { width: 11px; height: 18px; display: block; }
  .seg { display: flex; border: 1px solid var(--chrome-line); border-radius: 8px; overflow: hidden; background: var(--chrome-surface); }
  .seg button {
    flex: 1; border: 0; background: transparent; color: var(--chrome-muted); font: inherit;
    font-size: 12.5px; font-weight: 600; padding: 7px 10px; cursor: pointer;
  }
  .seg button + button { border-left: 1px solid var(--chrome-line); }
  .seg button.on { background: #1f6feb; color: #fff; }
  .seg2 button.on { background: #21262d; color: #fff; box-shadow: inset 0 0 0 1px var(--chrome-line); }
  input[type="color"] {
    width: 42px; height: 28px; padding: 2px; border: 1px solid var(--chrome-line);
    border-radius: 6px; background: transparent; cursor: pointer;
  }
  input[type="text"], input[type="url"] {
    flex: 1; min-width: 0; height: 28px; padding: 4px 9px; border: 1px solid var(--chrome-line);
    border-radius: 6px; font: inherit; font-size: 12px; color: var(--chrome-fg); background: var(--chrome-surface);
  }
  .toggle { display: flex; align-items: center; gap: 8px; font-size: 12.5px; cursor: pointer; user-select: none; }
  .toggle input { accent-color: var(--accent); width: 15px; height: 15px; cursor: pointer; }
  .row { display: flex; gap: 8px; align-items: center; }
  .chips { display: flex; flex-wrap: wrap; gap: 6px; }
  .chip {
    display: flex; align-items: center; gap: 6px; padding: 3px 9px 3px 5px;
    background: var(--chrome-surface); border: 1px solid var(--chrome-line); border-radius: 999px;
    cursor: pointer; font-size: 11px; font-weight: 600; color: var(--chrome-muted); font-family: inherit;
  }
  .chip:hover { color: var(--chrome-fg); }
  .chip i { width: 13px; height: 13px; border-radius: 50%; display: block; border: 1px solid var(--chrome-line); }
  label.range { display: flex; align-items: center; gap: 8px; font-size: 11.5px; color: var(--chrome-muted); }
  input[type="range"] { flex: 1; accent-color: var(--accent); }
  .cfield { display: grid; grid-template-columns: 1fr 42px 72px; gap: 8px; align-items: center; }
  .cfield .lab { font-size: 12px; }
  .cfield input[type="color"] { width: 42px; height: 26px; }
  .cfield input[type="text"] { height: 26px; font-size: 11.5px; }
  .btn {
    border: 1px solid var(--chrome-line); background: var(--chrome-surface); color: var(--chrome-fg);
    border-radius: 6px; padding: 6px 12px; font: inherit; font-size: 12.5px; font-weight: 600; cursor: pointer;
  }
  .btn.primary { background: var(--accent); border-color: var(--accent); color: #fff; }
  .btn:hover { border-color: #6e7681; }
  .muted { color: var(--chrome-muted); font-size: 12px; margin: 0; line-height: 1.5; }

  .stage { padding: 20px; max-width: 1080px; margin: 0 auto; }
  .stage > p { color: var(--chrome-muted); font-size: 12.5px; margin: 0 0 14px; }

  /* ---------------- fake GitHub page ---------------- */
  #app {
    --bgColor-default: #ffffff;
    --bgColor-muted: #f6f8fa;
    --bgColor-inset: #f6f8fa;
    --fgColor-default: #1f2328;
    --fgColor-muted: #59636e;
    --fgColor-subtle: #818b98;
    --borderColor-default: #d1d9e0;
    --borderColor-muted: #d1d9e0;
    --accent-fgColor: #0969da;
    --accent-emphasis: #0969da;
    --btn-primary-bg: #1f883d;
    --btn-primary-fg: #ffffff;
    --btn-bg: #f6f8fa;
    --btn-fg: #1f2328;
    --btn-border: #d1d9e0;
    --btn-hover-bg: #f3f4f6;
    --header-bgColor: #ffffff;
    --header-fgColor: #1f2328;
    position: relative; z-index: 0;
    background: var(--bgColor-default);
    background-size: cover; background-position: center;
    color: var(--fgColor-default);
    border: 1px solid var(--borderColor-default);
    border-radius: 10px;
    overflow: hidden;
    box-shadow: 0 12px 40px rgba(0,0,0,.45);
  }
  #ghx-scrim {
    position: absolute; inset: 0; z-index: -1; pointer-events: none;
    background: var(--bgColor-default); opacity: 0;
  }
  #app.ghx-bg .gh-header {
    background: transparent !important;
    backdrop-filter: blur(12px) saturate(1.4);
    -webkit-backdrop-filter: blur(12px) saturate(1.4);
  }
  .gh-header {
    display: flex; align-items: center; gap: 12px; padding: 12px 16px;
    background: var(--header-bgColor); color: var(--header-fgColor);
    border-bottom: 1px solid var(--borderColor-default);
  }
  .gh-logo { width: 26px; height: 26px; border-radius: 50%; background: var(--accent-emphasis); flex: none; }
  .gh-search {
    flex: 1; max-width: 320px; height: 26px; border-radius: 6px;
    border: 1px solid var(--borderColor-default); background: var(--bgColor-muted);
    display: flex; align-items: center; padding: 0 10px; color: var(--fgColor-muted); font-size: 12px;
  }
  .gh-avatars { margin-left: auto; display: flex; gap: 6px; }
  .gh-avatars i { width: 20px; height: 20px; border-radius: 50%; background: var(--fgColor-subtle); }

  .repo-head { display: flex; align-items: center; gap: 10px; padding: 14px 16px 6px; }
  .repo-head .path { font-size: 18px; font-weight: 600; }
  .repo-head .path span { color: var(--fgColor-muted); font-weight: 400; }
  .repo-head .path span:last-child { color: var(--fgColor-default); font-weight: 600; }
  .badge { margin-left: 4px; font-size: 11px; font-weight: 600; color: var(--fgColor-muted); border: 1px solid var(--borderColor-default); border-radius: 999px; padding: 2px 8px; }
  .actions { margin-left: auto; display: flex; gap: 8px; }
  .btn.gh {
    border: 1px solid var(--btn-border); background: var(--btn-bg); color: var(--btn-fg);
    border-radius: 6px; padding: 5px 12px; font: inherit; font-size: 12.5px; font-weight: 600; cursor: pointer;
  }
  .btn.gh:hover { background: var(--btn-hover-bg); }
  .btn.gh.primary { background: var(--btn-primary-bg); color: var(--btn-primary-fg); border-color: var(--btn-primary-bg); }

  .tabs {
    display: flex; gap: 4px; padding: 0 16px; overflow-x: auto;
    border-bottom: 1px solid var(--borderColor-default); background: var(--bgColor-default);
  }
  .tab {
    padding: 8px 10px; font-size: 13px; color: var(--fgColor-muted); cursor: pointer;
    border-bottom: 2px solid transparent; white-space: nowrap; display: flex; align-items: center; gap: 5px;
  }
  .tab .n { font-size: 11px; background: var(--bgColor-muted); border: 1px solid var(--borderColor-default); border-radius: 999px; padding: 0 6px; }
  .tab.active { color: var(--fgColor-default); font-weight: 600; border-bottom-color: var(--accent-emphasis); }

  .tips {
    display: none; gap: 10px; align-items: center; justify-content: space-between;
    margin: 12px 16px 0; padding: 9px 12px; border: 1px solid var(--borderColor-default);
    border-radius: 8px; background: var(--bgColor-muted); font-size: 12.5px;
  }
  .tips b { color: var(--accent-fgColor); }
  .tips button { flex: none; }
  #app[data-tips="1"] .tips { display: flex; }

  .layout { display: grid; grid-template-columns: 1fr 280px; gap: 16px; padding: 16px; }
  .filebar {
    display: flex; align-items: center; gap: 10px; padding: 8px 12px;
    background: var(--bgColor-muted); border: 1px solid var(--borderColor-default); border-radius: 6px 6px 0 0;
  }
  .branch { border: 1px solid var(--borderColor-default); background: var(--bgColor-default); border-radius: 6px; padding: 3px 8px; font-size: 12px; display: flex; gap: 6px; align-items: center; }
  .filebar .meta { margin-left: auto; font-size: 12px; color: var(--fgColor-muted); }
  .files { border: 1px solid var(--borderColor-default); border-top: 0; border-radius: 0 0 6px 6px; background: var(--bgColor-default); }
  .file { display: flex; gap: 10px; align-items: center; padding: 7px 12px; font-size: 13px; border-top: 1px solid var(--borderColor-muted); }
  .file:first-child { border-top: 0; }
  .file .ico { width: 14px; height: 14px; border-radius: 3px; background: var(--accent-emphasis); opacity: .85; flex: none; }
  .file .name { color: var(--accent-fgColor); font-weight: 500; }
  .file .name.plain { color: var(--fgColor-default); }
  .file .msg { margin-left: auto; font-size: 12px; color: var(--fgColor-muted); }

  .readme { margin-top: 16px; border: 1px solid var(--borderColor-default); border-radius: 6px; overflow: hidden; }
  .readme .h { display: flex; gap: 10px; padding: 9px 12px; background: var(--bgColor-muted); border-bottom: 1px solid var(--borderColor-default); font-size: 12px; font-weight: 600; }
  .readme .h span { color: var(--fgColor-muted); font-weight: 400; }
  .readme .body { padding: 16px; }
  .readme .body h3 { margin: 0 0 8px; font-size: 20px; }
  .readme .body p { margin: 0 0 10px; color: var(--fgColor-default); font-size: 13.5px; line-height: 1.6; }
  .line { height: 9px; border-radius: 4px; background: var(--fgColor-subtle); opacity: .5; margin: 6px 0; }

  .sidebar { display: flex; flex-direction: column; gap: 12px; }
  .box { border: 1px solid var(--borderColor-default); border-radius: 6px; }
  .box h4 { margin: 0; padding: 9px 12px; font-size: 13px; border-bottom: 1px solid var(--borderColor-default); background: var(--bgColor-muted); }
  .box .inner { padding: 10px 12px; font-size: 12.5px; color: var(--fgColor-muted); display: flex; flex-direction: column; gap: 6px; }
  .box .inner .row { display: flex; justify-content: space-between; gap: 8px; }
  .bar { height: 8px; border-radius: 4px; background: var(--accent-emphasis); }
  .bar.track { background: var(--bgColor-muted); border: 1px solid var(--borderColor-default); }
  .dots { display: flex; gap: 5px; }
  .dots i { width: 7px; height: 7px; border-radius: 50%; background: var(--accent-emphasis); }

  #app[data-simplify="gentle"] .tab-insights,
  #app[data-simplify="gentle"] .tab-settings,
  #app[data-simplify="gentle"] .releases,
  #app[data-simplify="gentle"] .languages,
  #app[data-simplify="gentle"] .contributors { display: none; }
  #app[data-simplify="focus"] .tab:not(.tab-code) { display: none; }
  #app[data-simplify="focus"] .sidebar { display: none; }
  #app[data-simplify="focus"] .layout { grid-template-columns: 1fr; }

  @media (max-width: 900px) { .panel { grid-template-columns: 1fr; } }
</style>
</head>
<body>
  <div class="panel">
    <div class="brand">
      <svg viewBox="0 0 48 48" width="38" height="38" aria-hidden="true">
        <rect x="1.5" y="1.5" width="45" height="45" rx="10" fill="#0a0a0c"/>
        <g stroke="#f0f0f2" stroke-width="3.4" fill="none" stroke-linecap="round" stroke-linejoin="round">
          <path d="M11 34 L24 26 L37 34"/>
          <path d="M15.5 28.5 L24 22.5 L32.5 28.5"/>
          <path d="M20 23.5 L24 20.8 L28 23.5"/>
        </g>
      </svg>
      <h1>OCTANE<small>live demo &middot; themes, backgrounds &amp; custom color schemes</small></h1>
    </div>

    <div class="col">
      <div class="control">
        <label>Themes</label>
        <div class="themes" id="themes"></div>
      </div>
      <div class="control">
        <label>Accent (overrides any preset)</label>
        <div class="row"><input type="color" id="accent" value="#0969da" /></div>
      </div>
      <div class="control">
        <label>Simplify</label>
        <div class="seg" id="simplify">
          <button data-v="off" type="button">Off</button>
          <button data-v="gentle" type="button">Gentle</button>
          <button data-v="focus" type="button">Focus</button>
        </div>
      </div>
      <div class="control">
        <label class="toggle"><input type="checkbox" id="tips" /> New-user tips banner</label>
      </div>
    </div>

    <div class="col">
      <div class="control">
        <label>Background</label>
        <div class="seg seg2" id="bgType">
          <button data-v="none" type="button">None</button>
          <button data-v="image" type="button">Image</button>
          <button data-v="gradient" type="button">Gradient</button>
          <button data-v="color" type="button">Color</button>
        </div>
        <div class="row" id="bgGradRow" hidden>
          <input type="color" id="bgC1" value="#5b7cfa" />
          <input type="color" id="bgC2" value="#bd93f9" />
        </div>
        <div class="row" id="bgColorRow" hidden>
          <input type="color" id="bgColor" value="#0d1117" />
        </div>
        <div class="row" id="bgUrlRow" hidden>
          <input type="url" id="bgUrl" placeholder="Paste an image URL (https://)" />
        </div>
        <div class="chips" id="gradientChips"></div>
        <label class="range">Fade <input type="range" id="bgFade" min="0" max="100" step="5" value="0" /> <span id="bgFadeVal">0%</span></label>
        <p class="muted">Wallpaper sits behind the page &mdash; cards stay solid, slide Fade up for readability.</p>
      </div>

      <div class="control">
        <label>Custom color scheme</label>
        <div class="seg seg2" id="customBase">
          <button data-v="light" type="button">Light</button>
          <button data-v="dark" type="button">Dark</button>
        </div>
        <div id="customFields"></div>
        <div class="row"><button class="btn primary" id="customApply" type="button">Use my scheme</button></div>
      </div>
    </div>
  </div>

  <div class="stage">
    <p>The box below is a stylized GitHub repo page, themed and simplified live by the same CSS variables the extension injects. Try <b>Kin-Beni</b> + a <b>gradient background</b> + <b>Focus</b>.</p>

    <div id="app" data-simplify="off" data-tips="0">
      <div id="ghx-scrim"></div>
      <div class="gh-header">
        <i class="gh-logo"></i>
        <div class="gh-search">Search or jump to&hellip;</div>
        <div class="gh-avatars"><i></i><i></i><i></i></div>
      </div>

      <div class="repo-head">
        <div class="path"><span>octane /</span> octane <span class="badge">Public</span></div>
        <div class="actions">
          <button class="btn gh">&#9733; Star</button>
          <button class="btn gh">Fork</button>
          <button class="btn gh primary">+ Code</button>
        </div>
      </div>

      <nav class="tabs">
        <span class="tab tab-code active">Code</span>
        <span class="tab tab-issues">Issues <span class="n">12</span></span>
        <span class="tab tab-pulls">Pull requests <span class="n">3</span></span>
        <span class="tab tab-actions">Actions</span>
        <span class="tab tab-projects">Projects</span>
        <span class="tab tab-wiki">Wiki</span>
        <span class="tab tab-security">Security</span>
        <span class="tab tab-insights">Insights</span>
        <span class="tab tab-settings">Settings</span>
      </nav>

      <div class="tips">
        <span><b>New to GitHub?</b> &nbsp; <b>Code</b> is the project&rsquo;s files &middot; the <b>README</b> explains what it does &middot; <b>Star</b> saves it, <b>Fork</b> copies it.</span>
        <button class="btn gh" type="button">Got it</button>
      </div>

      <main class="layout">
        <div class="content">
          <div class="filebar">
            <span class="branch">&#8962; main</span>
            <span>Go to file</span>
            <span class="meta">3 contributors &middot; 128 commits</span>
          </div>
          <div class="files">
            <div class="file"><i class="ico"></i><span class="name plain">src/</span><span class="msg">core source</span></div>
            <div class="file"><i class="ico"></i><span class="name plain">docs/</span><span class="msg">demo &amp; previews</span></div>
            <div class="file"><i class="ico"></i><span class="name">README.md</span><span class="msg">what this project does</span></div>
            <div class="file"><i class="ico"></i><span class="name">manifest.json</span><span class="msg">MV3 manifest</span></div>
            <div class="file"><i class="ico"></i><span class="name">LICENSE</span><span class="msg">MIT</span></div>
          </div>

          <div class="readme">
            <div class="h">README.md <span>documentation</span></div>
            <div class="body">
              <h3>OCTANE</h3>
              <p>Restyle GitHub with beautiful themes, custom backgrounds and your own color schemes &mdash; plus a declutter mode for newcomers.</p>
              <div class="line" style="width:82%"></div>
              <div class="line" style="width:64%"></div>
              <div class="line" style="width:73%"></div>
            </div>
          </div>
        </div>

        <aside class="sidebar">
          <div class="box about">
            <h4>About</h4>
            <div class="inner">Themes, backgrounds &amp; zen for GitHub. MIT licensed.</div>
          </div>
          <div class="box releases">
            <h4>Releases</h4>
            <div class="inner"><div class="row"><span>v0.2.0</span><span style="color:var(--accent-fgColor)">Latest</span></div><div class="row"><span>v0.0.2</span><span>3w ago</span></div></div>
          </div>
          <div class="box languages">
            <h4>Languages</h4>
            <div class="inner">
              <div class="row"><span>JavaScript</span><span>58%</span></div>
              <div class="bar track"><div class="bar" style="width:58%"></div></div>
              <div class="row"><span>Python</span><span>26%</span></div>
              <div class="bar track"><div class="bar" style="width:26%"></div></div>
              <div class="row"><span>CSS</span><span>16%</span></div>
              <div class="bar track"><div class="bar" style="width:16%"></div></div>
            </div>
          </div>
          <div class="box contributors">
            <h4>Contributors</h4>
            <div class="inner"><div class="dots"><i></i><i></i><i></i><i></i></div><span>+ 3 contributors</span></div>
          </div>
        </aside>
      </main>
    </div>
  </div>

<script>
@@THEMES_JS@@
</script>
<script>
(function () {
  var app = document.getElementById("app");
  var scrim = document.getElementById("ghx-scrim");
  var themesBox = document.getElementById("themes");
  var accentInput = document.getElementById("accent");
  var simplify = document.getElementById("simplify");
  var tips = document.getElementById("tips");

  var bgType = document.getElementById("bgType");
  var bgC1 = document.getElementById("bgC1"), bgC2 = document.getElementById("bgC2");
  var bgColor = document.getElementById("bgColor");
  var bgUrl = document.getElementById("bgUrl");
  var bgFade = document.getElementById("bgFade"), bgFadeVal = document.getElementById("bgFadeVal");
  var bgGradRow = document.getElementById("bgGradRow");
  var bgColorRow = document.getElementById("bgColorRow");
  var bgUrlRow = document.getElementById("bgUrlRow");
  var gradientChips = document.getElementById("gradientChips");

  var customBase = document.getElementById("customBase");
  var customFields = document.getElementById("customFields");
  var customApply = document.getElementById("customApply");

  var current = "kinbeni";
  var accent = "";
  var custom = { base: "dark", colors: Object.assign({}, GHX.CUSTOM_BASES.dark) };
  var bg = { type: "none", color: "#0d1117", c1: "#5b7cfa", c2: "#bd93f9", angle: 135, fade: 0, url: "" };

  /* ---------- theme ---------- */
  function swatch(t, key) {
    var v = t.vars[key];
    if (!v) v = key === "--accent-emphasis" ? (t.vars["--btn-primary-bg"] || "#888") : "#ccc";
    return '<i style="background:' + v + '"></i>';
  }

  function customVars() {
    return GHX.buildCustomVars(custom.base, Object.assign({}, GHX.CUSTOM_BASES[custom.base], custom.colors));
  }

  function renderThemes() {
    themesBox.innerHTML = "";
    GHX.THEMES.forEach(function (t) { addThemeCard(t.id, t.name, t.base, t.vars); });
    addThemeCard("custom", "My custom", custom.base, customVars());
  }

  function addThemeCard(id, name, base, vars) {
    var b = document.createElement("button");
    b.type = "button";
    b.className = "theme-card" + (id === current ? " on" : "");
    b.innerHTML = '<span class="sw">' +
      swatch({ vars: vars }, "--bgColor-default") +
      swatch({ vars: vars }, "--bgColor-muted") +
      swatch({ vars: vars }, "--accent-emphasis") +
      "</span><span>" + name + "</span>";
    b.addEventListener("click", function () { current = id; renderThemes(); applyTheme(); });
    themesBox.appendChild(b);
  }

  function applyTheme() {
    var vars;
    if (current === "custom") {
      vars = customVars();
    } else {
      var t = GHX.THEMES.find(function (x) { return x.id === current; });
      vars = Object.assign({}, t.vars);
      if (accent) {
        vars["--accent-fgColor"] = accent;
        vars["--accent-emphasis"] = accent;
        vars["--btn-primary-bg"] = accent;
        vars["--btn-primary-fg"] = GHX.readableText(accent);
      }
    }
    Object.keys(vars).forEach(function (k) { app.style.setProperty(k, vars[k]); });
    renderThemes();
    applyFx();
  }

  accentInput.addEventListener("input", function () {
    accent = accentInput.value;
    if (current !== "custom") applyTheme();
  });

  /* ---------- background ---------- */
  function applyBackground() {
    app.style.backgroundImage = "";
    app.style.backgroundColor = "";
    if (bg.type === "color") {
      app.style.backgroundColor = bg.color;
    } else if (bg.type === "gradient") {
      app.style.backgroundImage = "linear-gradient(" + (bg.angle || 135) + "deg, " + bg.c1 + ", " + bg.c2 + ")";
    } else if (bg.type === "image") {
      if (bg.url) app.style.backgroundImage = "url(\"" + bg.url + "\")";
    }
    scrim.style.opacity = (bg.type === "image" || bg.type === "gradient") ? (bg.fade / 100) : 0;
    app.classList.toggle("ghx-bg", bg.type !== "none");
    renderBackground();
  }

  function renderBackground() {
    bgType.querySelectorAll("button").forEach(function (b) { b.classList.toggle("on", b.dataset.v === bg.type); });
    bgGradRow.hidden = bg.type !== "gradient";
    bgColorRow.hidden = bg.type !== "color";
    bgUrlRow.hidden = bg.type !== "image";
    bgFadeVal.textContent = bg.fade + "%";
  }

  bgType.querySelectorAll("button").forEach(function (b) {
    b.addEventListener("click", function () { bg.type = b.dataset.v; applyBackground(); });
  });
  bgC1.addEventListener("input", function () { bg.c1 = bgC1.value; applyBackground(); });
  bgC2.addEventListener("input", function () { bg.c2 = bgC2.value; applyBackground(); });
  bgColor.addEventListener("input", function () { bg.color = bgColor.value; applyBackground(); });
  bgUrl.addEventListener("change", function () { bg.url = bgUrl.value.trim(); if (bg.url) bg.type = "image"; applyBackground(); });
  bgFade.addEventListener("input", function () { bg.fade = Number(bgFade.value); applyBackground(); });

  GHX.GRADIENTS.forEach(function (g) {
    var chip = document.createElement("button");
    chip.type = "button";
    chip.className = "chip";
    chip.innerHTML = '<i style="background:linear-gradient(135deg,' + g.c1 + "," + g.c2 + ')"></i>' + g.name;
    chip.addEventListener("click", function () {
      bg.type = "gradient"; bg.c1 = g.c1; bg.c2 = g.c2; bg.angle = g.angle;
      bgC1.value = g.c1; bgC2.value = g.c2;
      applyBackground();
    });
    gradientChips.appendChild(chip);
  });

  /* ---------- custom scheme ---------- */
  function renderCustom() {
    customBase.querySelectorAll("button").forEach(function (b) { b.classList.toggle("on", b.dataset.v === custom.base); });
    customFields.innerHTML = "";
    GHX.CUSTOM_FIELDS.forEach(function (f) {
      var color = custom.colors[f.key] || GHX.CUSTOM_BASES[custom.base][f.key];
      var row = document.createElement("div");
      row.className = "cfield";
      row.innerHTML = '<span class="lab">' + f.label + '</span>';
      var picker = document.createElement("input");
      picker.type = "color"; picker.value = color;
      var hex = document.createElement("input");
      hex.type = "text"; hex.maxLength = 7; hex.value = color; hex.spellcheck = false;
      picker.addEventListener("input", function () {
        hex.value = picker.value;
        custom.colors[f.key] = picker.value;
        if (current === "custom") applyTheme(); else renderThemes();
      });
      hex.addEventListener("change", function () {
        if (/^#?[0-9a-f]{6}$/i.test(hex.value.trim())) {
          var v = hex.value.trim(); v = v[0] === "#" ? v : "#" + v;
          picker.value = v;
          custom.colors[f.key] = v;
          if (current === "custom") applyTheme(); else renderThemes();
        } else { hex.value = picker.value; }
      });
      row.appendChild(picker); row.appendChild(hex);
      customFields.appendChild(row);
    });
  }

  customBase.querySelectorAll("button").forEach(function (b) {
    b.addEventListener("click", function () {
      custom.base = b.dataset.v;
      custom.colors = Object.assign({}, GHX.CUSTOM_BASES[custom.base]);
      renderCustom(); renderThemes();
      if (current === "custom") applyTheme();
    });
  });
  customApply.addEventListener("click", function () { current = "custom"; applyTheme(); });

  /* ---------- ambient effects ---------- */
  var fx = { type: null, canvas: null, ctx: null, parts: [], raf: 0, last: 0 };
  function fxMake(type) {
    var parts = [], i, r = Math.random;
    if (type === "petals") {
      for (i = 0; i < 14; i++) parts.push({ x: r(), y: r(), s: 5 + r() * 7, vy: 0.06 + r() * 0.08, vx: 0.004, sway: 0.05 + r() * 0.08, ph: r() * 6.28, rot: r() * 6.28, vr: (r() - 0.5) * 1.6, l: 0.72 + r() * 0.22, a: 0.5 + r() * 0.4 });
    } else if (type === "stars") {
      for (i = 0; i < 90; i++) parts.push({ x: r(), y: r(), r: 0.4 + r() * 1.3, tw: 0.6 + r() * 2.4, ph: r() * 6.28, ba: 0.35 + r() * 0.6, c: r() > 0.72 ? "247,201,72" : (r() > 0.5 ? "210,215,255" : "255,255,255") });
    } else {
      for (i = 0; i < 26; i++) parts.push({ x: r(), y: r(), r: 1 + r() * 2, vy: 0.05 + r() * 0.1, vx: (r() - 0.5) * 0.02, life: r() * 250, fl: r() * 6.28, gold: r() > 0.5 });
    }
    return parts;
  }
  function fxFrame(now) {
    if (!fx.ctx || !fx.canvas) return;
    var W = fx.canvas.width, H = fx.canvas.height;
    var dt = Math.min(0.05, (now - fx.last) / 1000 || 0.016); fx.last = now;
    fx.ctx.clearRect(0, 0, W, H);
    var t = now / 1000, i, p;
    for (i = 0; i < fx.parts.length; i++) {
      p = fx.parts[i];
      if (fx.type === "petals") {
        p.y += p.vy * dt; p.x += Math.sin(t * 1.2 + p.ph) * p.sway * dt + p.vx * dt; p.rot += p.vr * dt;
        if (p.y > 1.02) { p.y = -0.03; p.x = Math.random(); }
        fx.ctx.save(); fx.ctx.translate(p.x * W, p.y * H); fx.ctx.rotate(p.rot);
        fx.ctx.fillStyle = "hsla(" + (335 + Math.sin(t + p.ph) * 6).toFixed(0) + ",85%," + (p.l * 100).toFixed(0) + "%," + p.a.toFixed(3) + ")";
        fx.ctx.beginPath(); fx.ctx.ellipse(0, 0, p.s, p.s * 0.45, 0, 0, 6.28); fx.ctx.fill(); fx.ctx.restore();
      } else if (fx.type === "stars") {
        var a = p.ba * (0.45 + 0.55 * Math.sin(t * p.tw + p.ph));
        if (a < 0.02) continue;
        fx.ctx.fillStyle = "rgba(" + p.c + "," + a.toFixed(3) + ")";
        fx.ctx.beginPath(); fx.ctx.arc(p.x * W, p.y * H, p.r, 0, 6.28); fx.ctx.fill();
      } else {
        p.life -= dt * 60; p.y -= p.vy * dt; p.x += p.vx * dt;
        if (p.life <= 0 || p.y < -0.03) { p.life = 150 + Math.random() * 250; p.x = Math.random(); p.y = 1.02; }
        var fa = Math.min(1, p.life / 120) * (0.55 + 0.45 * Math.sin(t * 3 + p.fl));
        if (fa < 0.02) continue;
        fx.ctx.fillStyle = p.gold ? "rgba(247,201,72," + fa.toFixed(3) + ")" : "rgba(189,147,249," + fa.toFixed(3) + ")";
        fx.ctx.beginPath(); fx.ctx.arc(p.x * W, p.y * H, p.r, 0, 6.28); fx.ctx.fill();
      }
    }
    fx.raf = requestAnimationFrame(fxFrame);
  }
  function applyFx() {
    var type = (GHX.THEME_FX && GHX.THEME_FX[current]) || null;
    if (type === fx.type && fx.canvas && fx.canvas.isConnected) return;
    if (fx.raf) cancelAnimationFrame(fx.raf);
    if (fx.canvas && fx.canvas.parentNode) fx.canvas.parentNode.removeChild(fx.canvas);
    fx = { type: null, canvas: null, ctx: null, parts: [], raf: 0, last: 0 };
    if (!type) return;
    var cv = document.createElement("canvas");
    cv.style.cssText = "position:fixed;inset:0;pointer-events:none;z-index:999;";
    document.body.appendChild(cv);
    fx.type = type; fx.canvas = cv; fx.ctx = cv.getContext("2d");
    cv.width = window.innerWidth; cv.height = window.innerHeight;
    fx.parts = fxMake(type); fx.last = performance.now();
    fx.raf = requestAnimationFrame(fxFrame);
  }

  /* ---------- simplify + tips ---------- */
  simplify.querySelectorAll("button").forEach(function (b) {
    b.addEventListener("click", function () {
      simplify.querySelectorAll("button").forEach(function (x) { x.classList.remove("on"); });
      b.classList.add("on");
      app.setAttribute("data-simplify", b.dataset.v);
    });
  });
  tips.addEventListener("change", function () { app.setAttribute("data-tips", tips.checked ? "1" : "0"); });

  /* ---------- init ---------- */
  simplify.querySelector('[data-v="off"]').classList.add("on");
  renderThemes();
  renderCustom();
  applyTheme();
})();
</script>
</body>
</html>
"""


def main():
    themes_js = open(os.path.join(ROOT, "shared", "themes.js"), encoding="utf-8").read()
    html = TEMPLATE.replace("@@THEMES_JS@@", themes_js)
    out = os.path.join(ROOT, "docs", "demo.html")
    os.makedirs(os.path.dirname(out), exist_ok=True)
    with open(out, "w", encoding="utf-8") as f:
        f.write(html)
    print("demo written:", out, f"({len(html)} bytes)")


if __name__ == "__main__":
    main()
