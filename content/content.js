/**
 * OCTANE content script — v0.4.3
 *
 * Runs on github.com / gist.github.com. Responsibilities:
 *   1. Inject the active theme (preset or custom) as CSS custom properties
 *      with !important so GitHub's own theme CSS can never win the cascade.
 *   2. Apply a custom background (image / gradient / color) + glassy navbar.
 *      The wallpaper only shows through on repository pages; on the
 *      dashboard/feed the content stays solid so nothing looks broken.
 *   3. Ambient effects per theme (falling petals, twinkling stars, embers).
 *   4. Simplify modes (gentle / focus) built on Signal vs Context vs Noise.
 *   5. Tips banner (independent) + a Focus indicator pill + Ctrl+Shift+F.
 *   6. Optional "hide horizontal scrollbars".
 *   7. Re-applies across SPA navigation and as GitHub renders (MutationObserver).
 *
 * Everything is defensive: theme work is pure CSS variables (GitHub-proof),
 * DOM work is text/attribute based with multiple fallback selectors, and all
 * entry points are wrapped so a GitHub change can never throw and kill the
 * extension.
 */
(function () {
  "use strict";

  var GHX = self.GHX;
  if (!GHX) return; // themes.js failed to load

  var STYLE_ID = "ghx-style";
  var lastUrl = location.href;
  var tipsDismissed = false;

  /* ------------------------------------------------------------------ *
   * Settings (normalized; bgImage lives in storage.local)
   * ------------------------------------------------------------------ */
  function getAll(cb) {
    try {
      chrome.storage.sync.get(GHX.DEFAULTS, function (s) {
        var merged = GHX.normalizeSettings(s);
        chrome.storage.local.get({ bgImage: "" }, function (l) {
          merged.bgImage = (l && l.bgImage) || "";
          cb(merged);
        });
      });
    } catch (e) {
      cb(Object.assign({}, GHX.DEFAULTS));
    }
  }

  function findTheme(id) {
    return GHX.THEMES.find(function (t) { return t.id === id; }) || GHX.THEMES[0];
  }

  /* ------------------------------------------------------------------ *
   * Theme CSS
   * ------------------------------------------------------------------ */
  function themeVars(settings) {
    if (settings.theme === "custom") {
      var c = settings.custom || {};
      var base = c.base === "light" ? "light" : "dark";
      return GHX.buildCustomVars(base, Object.assign({}, GHX.CUSTOM_BASES[base], c.colors || {}));
    }
    var vars = Object.assign({}, findTheme(settings.theme).vars);

    if (settings.accent && /^#[0-9a-f]{6}$/i.test(settings.accent)) {
      var a = settings.accent;
      var hover = GHX.shade(a, -0.12);
      var text = GHX.readableText(a);
      Object.assign(vars, {
        "--accent-fgColor": a, "--accent-emphasis": a,
        "--accent-muted": a + "55", "--accent-subtle": a + "1f",
        "--btn-primary-bg": a, "--btn-primary-hover-bg": hover,
        "--btn-primary-border": a, "--btn-primary-fg": text,
        "--fgColor-accent": a, "--fgColor-link": a,
        "--color-accent-fg": a, "--color-accent-emphasis": a,
        "--color-accent-muted": a + "55", "--color-accent-subtle": a + "1f",
        "--color-btn-primary-bg": a, "--color-btn-primary-hover-bg": hover,
        "--color-btn-primary-text": text
      });
    }
    return vars;
  }

  function buildThemeCss(settings) {
    var vars = themeVars(settings);
    var lines = Object.keys(vars).map(function (k) {
      return "  " + k + ": " + vars[k] + " !important;";
    });
    return ":root,\nhtml[data-color-mode],\nhtml[data-color-mode=\"light\"],\nhtml[data-color-mode=\"dark\"],\nhtml[data-color-mode=\"auto\"],\nhtml[data-color-mode=\"dark\" i],\nhtml[data-color-mode=\"light\" i] {\n" +
      lines.join("\n") + "\n}\n";
  }

  /* ------------------------------------------------------------------ *
   * Background + containers
   * ------------------------------------------------------------------ */
  function wallpaperActive(settings) {
    var bg = settings.bg || {};
    if (!bg.type || bg.type === "none") return false;
    if (bg.type === "image") return !!(settings.bgImage || bg.url);
    return true;
  }

  function containerCss(settings) {
    var rules = [];
    if (wallpaperActive(settings)) {
      rules.push(
        "html[data-ghx-theme] body,",
        "html[data-ghx-theme] .application-main,",
        "html[data-ghx-theme] main,",
        "html[data-ghx-theme] #repo-content-pjax-container,",
        "html[data-ghx-theme] #js-pjax-container,",
        "html[data-ghx-theme] .Layout-main {",
        "  background-color: transparent !important;",
        "}"
      );
    } else {
      rules.push(
        "html[data-ghx-theme] body,",
        "html[data-ghx-theme] .application-main,",
        "html[data-ghx-theme] main,",
        "html[data-ghx-theme] #repository-container-header,",
        "html[data-ghx-theme] #__next {",
        "  background-color: var(--bgColor-default) !important;",
        "}"
      );
    }
    rules.push("html[data-ghx-theme] body { color: var(--fgColor-default) !important; }");
    return rules.join("\n");
  }

  function clamp(n, lo, hi) { return Math.max(lo, Math.min(hi, n)); }

  function buildBgCss(settings, onRepo) {
    var bg = settings.bg || {};
    if (!bg.type || bg.type === "none") return "";
    var rules = [];
    var fade = clamp(Number(bg.fade) || 0, 0, 100);
    // On non-repo pages (dashboard, feed, profile) the layout is denser, so
    // enforce a readability floor: the wallpaper still shows, just dimmer.
    var scrim = onRepo ? fade : Math.max(fade, 55);

    if (bg.type === "color") {
      rules.push("html { background-color: " + bg.color + " !important; }");
    } else if (bg.type === "gradient") {
      rules.push(
        "html { background-image: linear-gradient(" + (Number(bg.angle) || 135) + "deg, " +
        bg.c1 + ", " + bg.c2 + ") !important; " +
        "background-repeat: no-repeat; background-attachment: fixed; background-size: cover; }"
      );
    } else if (bg.type === "image") {
      var src = settings.bgImage || bg.url || "";
      if (!src) return "";
      rules.push(
        "html { background-image: url(\"" + src + "\") !important; " +
        "background-repeat: no-repeat; background-attachment: fixed; " +
        "background-size: cover; background-position: center; }"
      );
    }

    rules.push("body { background-color: transparent !important; }");

    if (bg.type !== "color") {
      rules.push(
        "html::before { content: \"\"; position: fixed; inset: 0; z-index: -1; " +
        "pointer-events: none; background-color: var(--bgColor-default); " +
        "opacity: " + (scrim / 100) + "; }"
      );
    }
    return rules.join("\n");
  }

  /* Glassy top navbar when a wallpaper is active. */
  function glassCss(settings) {
    if (!wallpaperActive(settings)) return "";
    var vars = themeVars(settings);
    var rgb = GHX.hexToRgb(vars["--header-bgColor"]) ||
              GHX.hexToRgb(vars["--bgColor-default"]) ||
              { r: 13, g: 17, b: 23 };
    var rgba = "rgba(" + rgb.r + "," + rgb.g + "," + rgb.b + ",0.55)";
    return [
      "html[data-ghx-theme] .AppHeader,",
      "html[data-ghx-theme] header.HeaderMktg,",
      "html[data-ghx-theme] header[data-marketing-header],",
      "html[data-ghx-theme] .Header {",
      "  background-color: " + rgba + " !important;",
      "  backdrop-filter: blur(14px) saturate(1.5) !important;",
      "  -webkit-backdrop-filter: blur(14px) saturate(1.5) !important;",
      "}",
      ""
    ].join("\n");
  }

  /* ------------------------------------------------------------------ *
   * Optional: hide horizontal ("side") scrollbars in code & tables.
   * Content still scrolls via trackpad / Shift+wheel.
   * ------------------------------------------------------------------ */
  var HSCROLL_CSS = [
    "/* OCTANE: hide horizontal scrollbars */",
    "html[data-ghx-hscroll] ::-webkit-scrollbar:horizontal { height: 0 !important; display: none !important; }",
    "html[data-ghx-hscroll] pre,",
    "html[data-ghx-hscroll] .highlight,",
    "html[data-ghx-hscroll] .Box,",
    "html[data-ghx-hscroll] table,",
    "html[data-ghx-hscroll] [class*=\"overflow-x\"],",
    "html[data-ghx-hscroll] [class*=\"Overflow\"] {",
    "  scrollbar-width: none !important;",
    "}",
    "html[data-ghx-hscroll] pre::-webkit-scrollbar,",
    "html[data-ghx-hscroll] .highlight::-webkit-scrollbar,",
    "html[data-ghx-hscroll] .Box::-webkit-scrollbar,",
    "html[data-ghx-hscroll] table::-webkit-scrollbar,",
    "html[data-ghx-hscroll] [class*=\"overflow-x\"]::-webkit-scrollbar {",
    "  width: 0 !important; height: 0 !important; display: none !important;",
    "}",
    ""
  ].join("\n");

  /* ------------------------------------------------------------------ *
   * Static CSS: tips, simplify de-emphasis rules
   * ------------------------------------------------------------------ */
  var EXTRA_CSS = [
    "/* OCTANE: new-user tips banner */",
    ".ghx-tips {",
    "  display: flex; gap: 12px; align-items: center; justify-content: space-between;",
    "  margin: 16px auto 0; max-width: 1280px; padding: 10px 16px;",
    "  border: 1px solid var(--borderColor-default, #d1d9e0); border-radius: 8px;",
    "  background: var(--bgColor-muted, #f6f8fa); color: var(--fgColor-default, #1f2328);",
    "  font-size: 13px; line-height: 1.5; font-family: inherit;",
    "}",
    ".ghx-tips-body { display: flex; flex-direction: column; gap: 2px; min-width: 0; }",
    ".ghx-tips-body b { font-weight: 600; color: var(--accent-fgColor, #0969da); }",
    ".ghx-tips-close {",
    "  flex: none; border: 1px solid var(--borderColor-default, #d1d9e0);",
    "  background: var(--btn-bg, #f6f8fa); color: var(--fgColor-default, #1f2328);",
    "  padding: 5px 12px; border-radius: 6px; cursor: pointer; font-size: 12px; font-weight: 600;",
    "}",
    ".ghx-tips-close:hover { background: var(--btn-hover-bg, #f3f4f6); }",
    "/* OCTANE: simplify de-emphasis (Context) */",
    "body.ghx-simplify-gentle [data-ghx-context],",
    "body.ghx-simplify-focus [data-ghx-context] {",
    "  opacity: .5 !important; filter: saturate(.7); transition: opacity .2s ease;",
    "}",
    "body.ghx-simplify-gentle .social-count,",
    "body.ghx-simplify-gentle .Counter { opacity: .45 !important; filter: saturate(.4); }",
    "/* OCTANE: focus hides Noise */",
    "body.ghx-simplify-focus ul.pagehead-actions,",
    "body.ghx-simplify-focus .social-count,",
    "body.ghx-simplify-focus .Counter,",
    "body.ghx-simplify-focus [data-testid=\"latest-commit-details\"] {",
    "  display: none !important;",
    "}",
    ""
  ].join("\n");

  function injectStyle(css) {
    if (!document.head) {
      requestAnimationFrame(function () { injectStyle(css); });
      return;
    }
    var el = document.getElementById(STYLE_ID);
    if (!el) {
      el = document.createElement("style");
      el.id = STYLE_ID;
      document.head.appendChild(el);
    }
    el.textContent = css;
  }

  function applyTheme(settings) {
    var base;
    if (settings.theme === "custom") {
      base = (settings.custom && settings.custom.base) === "light" ? "light" : "dark";
    } else {
      base = findTheme(settings.theme).base;
    }
    var root = document.documentElement;
    var onRepo = isRepoPage();
    if (root) {
      root.setAttribute("data-color-mode", base);
      root.setAttribute("data-ghx-theme", settings.theme);
      if (settings.hideHScroll) root.setAttribute("data-ghx-hscroll", "1");
      else root.removeAttribute("data-ghx-hscroll");
      try { root.style.colorScheme = base; } catch (e) {}
    }
    injectStyle(
      buildThemeCss(settings) + "\n" +
      buildBgCss(settings, onRepo) + "\n" +
      containerCss(settings) + "\n" +
      glassCss(settings) + "\n" +
      HSCROLL_CSS + "\n" +
      EXTRA_CSS
    );
  }

  /* ------------------------------------------------------------------ *
   * Ambient effects — a single fixed canvas keyed to the active theme
   * ------------------------------------------------------------------ */
  var FX = { type: null, canvas: null, ctx: null, parts: [], raf: 0, W: 0, H: 0, last: 0 };

  function fxResize() {
    FX.W = window.innerWidth || document.documentElement.clientWidth || 800;
    FX.H = window.innerHeight || document.documentElement.clientHeight || 600;
    if (FX.canvas) { FX.canvas.width = FX.W; FX.canvas.height = FX.H; }
  }

  function fxMake(type) {
    var parts = [], i, r = Math.random;
    if (type === "petals") {
      for (i = 0; i < 18; i++) parts.push({
        x: r(), y: r(), size: 6 + r() * 8,
        vy: 0.05 + r() * 0.08, vx: 0.004 + r() * 0.006,
        sway: 0.05 + r() * 0.09, phase: r() * Math.PI * 2,
        rot: r() * Math.PI * 2, vr: (r() - 0.5) * 1.6,
        light: 0.72 + r() * 0.22, alpha: 0.5 + r() * 0.4
      });
    } else if (type === "stars") {
      for (i = 0; i < 120; i++) {
        var gold = r() > 0.72;
        parts.push({
          x: r(), y: r(), r: 0.4 + r() * 1.3,
          tw: 0.6 + r() * 2.4, phase: r() * Math.PI * 2,
          baseA: 0.35 + r() * 0.6,
          color: gold ? "247,201,72" : (r() > 0.5 ? "210,215,255" : "255,255,255")
        });
      }
    } else { // embers
      for (i = 0; i < 34; i++) parts.push({
        x: r(), y: r(), r: 1 + r() * 2.2,
        vy: 0.05 + r() * 0.1, vx: (r() - 0.5) * 0.02,
        life: r() * 250, flick: r() * Math.PI * 2, gold: r() > 0.5
      });
    }
    return parts;
  }

  function fxFrame(now) {
    if (document.hidden) { FX.raf = requestAnimationFrame(fxFrame); return; }
    var ctx = FX.ctx;
    if (!ctx || !FX.canvas) return;
    var W = FX.W, H = FX.H;
    var dt = Math.min(0.05, (now - FX.last) / 1000 || 0.016);
    FX.last = now;
    ctx.clearRect(0, 0, W, H);
    var t = now / 1000, i, p;
    for (i = 0; i < FX.parts.length; i++) {
      p = FX.parts[i];
      if (FX.type === "petals") {
        p.y += p.vy * dt;
        p.x += Math.sin(t * 1.2 + p.phase) * p.sway * dt + p.vx * dt;
        p.rot += p.vr * dt;
        if (p.y > 1.02) { p.y = -0.03; p.x = Math.random(); }
        ctx.save();
        ctx.translate(p.x * W, p.y * H);
        ctx.rotate(p.rot);
        ctx.fillStyle = "hsla(" + (335 + Math.sin(t + p.phase) * 6).toFixed(0) +
          ", 85%, " + (p.light * 100).toFixed(0) + "%, " + p.alpha.toFixed(3) + ")";
        ctx.beginPath();
        ctx.ellipse(0, 0, p.size, p.size * 0.45, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      } else if (FX.type === "stars") {
        var a = p.baseA * (0.45 + 0.55 * Math.sin(t * p.tw + p.phase));
        if (a < 0.02) continue;
        ctx.fillStyle = "rgba(" + p.color + "," + a.toFixed(3) + ")";
        ctx.beginPath();
        ctx.arc(p.x * W, p.y * H, p.r, 0, Math.PI * 2);
        ctx.fill();
      } else {
        p.life -= dt * 60;
        p.y -= p.vy * dt;
        p.x += p.vx * dt;
        if (p.life <= 0 || p.y < -0.03) { p.life = 150 + Math.random() * 250; p.x = Math.random(); p.y = 1.02; }
        var fa = Math.min(1, p.life / 120) * (0.55 + 0.45 * Math.sin(t * 3 + p.flick));
        if (fa < 0.02) continue;
        ctx.fillStyle = p.gold ? "rgba(247,201,72," + fa.toFixed(3) + ")" : "rgba(189,147,249," + fa.toFixed(3) + ")";
        ctx.beginPath();
        ctx.arc(p.x * W, p.y * H, p.r, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    FX.raf = requestAnimationFrame(fxFrame);
  }

  function startFx(type) {
    stopFx();
    if (!type) return;
    if (!document.body) { setTimeout(function () { startFx(type); }, 400); return; }
    var canvas = document.createElement("canvas");
    canvas.id = "ghx-fx";
    canvas.style.cssText = "position:fixed;inset:0;pointer-events:none;z-index:2147483646;";
    document.body.appendChild(canvas);
    FX.type = type; FX.canvas = canvas; FX.ctx = canvas.getContext("2d");
    FX.parts = fxMake(type); FX.last = performance.now();
    fxResize();
    FX.raf = requestAnimationFrame(fxFrame);
  }

  function stopFx() {
    if (FX.raf) cancelAnimationFrame(FX.raf);
    FX.raf = 0;
    if (FX.canvas && FX.canvas.parentNode) FX.canvas.parentNode.removeChild(FX.canvas);
    FX.canvas = FX.ctx = null; FX.parts = []; FX.type = null;
  }

  function updateFx(settings) {
    var type = (settings.fx !== false) ? ((GHX.THEME_FX && GHX.THEME_FX[settings.theme]) || null) : null;
    if (type === FX.type) {
      if (type && FX.canvas && !FX.canvas.isConnected) startFx(type);
      return;
    }
    startFx(type);
  }

  /* ------------------------------------------------------------------ *
   * Simplification — Signal (keep) / Context (mute) / Noise (hide)
   * ------------------------------------------------------------------ */
  function norm(s) {
    return String(s || "")
      .replace(/[\d\u200b]/g, "")
      .replace(/\s+/g, " ")
      .trim()
      .toLowerCase();
  }

  var GENTLE_HIDE = ["releases", "packages", "deployments"];
  var GENTLE_MUTE = ["languages", "contributors", "used by"];
  var FOCUS_HIDE = ["releases", "packages", "deployments", "languages", "used by", "milestones"];
  var FOCUS_MUTE = ["contributors"]; // keep avatars (profile pictures), just de-emphasize
  var GENTLE_TABS = ["insights", "settings"];
  var PROMOS = [
    "try github copilot", "free github copilot", "upgrade to pro",
    "get started with github", "take a tour", "start your free trial"
  ];

  function hide(el) {
    if (!el || el.getAttribute("data-ghx-hidden")) return;
    el.style.setProperty("display", "none", "important");
    el.setAttribute("data-ghx-hidden", "1");
  }

  function clearSimplifyMarks() {
    document.querySelectorAll("[data-ghx-hidden]").forEach(function (el) {
      el.style.removeProperty("display");
      el.removeAttribute("data-ghx-hidden");
    });
    document.querySelectorAll("[data-ghx-context]").forEach(function (el) {
      el.removeAttribute("data-ghx-context");
    });
    if (document.body) {
      document.body.classList.remove("ghx-simplify-gentle", "ghx-simplify-focus");
    }
  }

  var NON_REPO = [
    "settings", "notifications", "explore", "marketplace", "new", "orgs",
    "sponsors", "topics", "trending", "collections", "pulls", "issues",
    "security", "account", "codespaces", "features", "contact", "about",
    "pricing", "login", "signup", "search", "mine", "stars", "readme",
    "repositories", "discussions", "gists"
  ];

  function isRepoPage() {
    var seg = location.pathname.split("/").filter(Boolean);
    if (seg.length < 2) return false;
    return NON_REPO.indexOf(seg[0]) === -1;
  }

  function sidebarSectionBox(h) {
    return h.closest('[class*="SidebarSection-module__sidebarSection"]') ||
           h.closest(".BorderGrid-row");
  }

  function markSections(level) {
    var hideList = level === "gentle" ? GENTLE_HIDE : FOCUS_HIDE;
    var muteList = level === "gentle" ? GENTLE_MUTE : FOCUS_MUTE;
    document.querySelectorAll(
      '[class*="SidebarSection-module__sectionHeading"], .Layout-sidebar h2, .Layout-sidebar h3, .Layout-sidebar h4'
    ).forEach(function (h) {
      var t = norm(h.textContent);
      if (!t) return;
      var box = sidebarSectionBox(h);
      if (!box) return;
      if (hideList.indexOf(t) !== -1) hide(box);
      else if (muteList.indexOf(t) !== -1) box.setAttribute("data-ghx-context", "1");
    });
  }

  function repoTabLinks() {
    var out = [];
    document.querySelectorAll("a[data-tab-item], a.UnderlineNav-item, nav.UnderlineNav a").forEach(function (a) {
      if (out.indexOf(a) === -1) out.push(a);
    });
    return out;
  }

  function markTabs(level) {
    if (!isRepoPage()) return;
    repoTabLinks().forEach(function (a) {
      var t = norm(a.textContent);
      if (!t) return;
      if (level === "focus") {
        if (t !== "code") hide(a);
      } else if (GENTLE_TABS.indexOf(t) !== -1) {
        hide(a);
      }
    });
  }

  function markPromos() {
    document.querySelectorAll("a, button, p, [class*='Banner'], [class*='banner']").forEach(function (el) {
      if (el.children.length > 8) return;
      var t = norm(el.textContent);
      if (!t || t.length > 90) return;
      var hit = PROMOS.some(function (p) { return t.indexOf(p) !== -1; });
      if (!hit) return;
      var box = el.closest('[class*="Banner"], [class*="banner"], .Box, .flash, [data-testid]');
      hide(box || el);
    });
  }

  function markDiscovery() {
    ["/explore", "/trending", "/topics", "/collections", "/sponsors"].forEach(function (href) {
      document.querySelectorAll('a[href="' + href + '"]').forEach(hide);
    });
  }

  function countHidden() {
    return document.querySelectorAll("[data-ghx-hidden]").length;
  }

  function updatePill(count) {
    var pill = document.getElementById("ghx-pill");
    if (!pill) {
      pill = document.createElement("button");
      pill.id = "ghx-pill";
      pill.type = "button";
      pill.style.cssText =
        "position:fixed;left:14px;bottom:14px;z-index:2147483645;" +
        "border:1px solid var(--borderColor-default,#30363d);" +
        "background:var(--bgColor-muted,#161b22);color:var(--fgColor-default,#e6edf3);" +
        "padding:7px 13px;border-radius:999px;cursor:pointer;" +
        "font:600 12px/1 -apple-system,'Segoe UI',Helvetica,Arial,sans-serif;" +
        "box-shadow:0 4px 18px rgba(0,0,0,.3);backdrop-filter:blur(8px);";
      pill.addEventListener("click", function () {
        chrome.storage.sync.set({ simplify: "off" });
      });
      document.body.appendChild(pill);
    }
    pill.textContent = "\uD83C\uDFAF Focus \u00B7 " + count + " hidden \u00B7 click to exit";
  }

  function removePill() {
    var pill = document.getElementById("ghx-pill");
    if (pill) pill.remove();
  }

  function applySimplify(level) {
    if (!document.body) return;
    clearSimplifyMarks();
    if (level !== "gentle" && level !== "focus") { removePill(); return; }
    document.body.classList.add(level === "gentle" ? "ghx-simplify-gentle" : "ghx-simplify-focus");
    markSections(level);
    markTabs(level);
    markPromos();
    if (level === "focus") {
      markDiscovery();
      updatePill(countHidden());
    } else {
      removePill();
    }
  }

  /* ------------------------------------------------------------------ *
   * Tips banner (independent of simplify)
   * ------------------------------------------------------------------ */
  function insertBanner() {
    if (document.querySelector("[data-ghx-banner]")) return;
    var anchors = ["#repository-container-header", ".application-main", "main"];
    var target = null;
    for (var i = 0; i < anchors.length; i++) {
      target = document.querySelector(anchors[i]);
      if (target) break;
    }
    if (!target || !target.parentNode) return;
    var banner = document.createElement("div");
    banner.className = "ghx-tips";
    banner.setAttribute("data-ghx-banner", "1");
    banner.innerHTML =
      '<div class="ghx-tips-body">' +
        "<strong>New to GitHub? Quick start</strong>" +
        "<span><b>Code</b> is the project&rsquo;s files &middot; the <b>README</b> explains what it does &middot; " +
        "<b>Star</b> saves it to your list, <b>Fork</b> copies it to your account.</span>" +
      "</div>" +
      '<button class="ghx-tips-close" type="button">Got it</button>';
    banner.querySelector(".ghx-tips-close").addEventListener("click", function () {
      banner.remove();
      tipsDismissed = true;
    });
    target.parentNode.insertBefore(banner, target);
  }

  function applyTips(show) {
    var existing = document.querySelector("[data-ghx-banner]");
    if (show && !tipsDismissed) {
      if (!existing) insertBanner();
    } else if (!show && existing) {
      existing.remove();
    }
  }

  /* ------------------------------------------------------------------ *
   * Orchestration
   * ------------------------------------------------------------------ */
  function applyAll() {
    try {
      getAll(function (s) {
        try {
          applyTheme(s);
          applySimplify(s.simplify);
          applyTips(s.tips);
          updateFx(s);
          startObserver();
        } catch (e) {}
      });
    } catch (e) {}
  }

  function onNavigate() {
    lastUrl = location.href;
    tipsDismissed = false;
    applyAll();
    setTimeout(applyAll, 600);
    setTimeout(applyAll, 1800);
  }

  var applyTimer = null;
  function scheduleApply(delay) {
    clearTimeout(applyTimer);
    applyTimer = setTimeout(applyAll, delay || 300);
  }

  var observer = null;
  function startObserver() {
    if (observer || !document.body) return;
    try {
      observer = new MutationObserver(function (muts) {
        var interesting = false;
        for (var i = 0; i < muts.length && !interesting; i++) {
          var m = muts[i];
          if (m.type !== "childList") continue;
          var arr = m.addedNodes.length ? m.addedNodes : m.removedNodes;
          for (var j = 0; j < arr.length; j++) {
            if (arr[j].nodeType === 1) { interesting = true; break; }
          }
        }
        if (interesting) scheduleApply();
      });
      observer.observe(document.body, { childList: true, subtree: true });
    } catch (e) {}
  }

  try {
    chrome.storage.onChanged.addListener(function (changes, area) {
      if (area === "sync" || area === "local") applyAll();
    });
  } catch (e) {}

  // Ctrl/Cmd + Shift + F toggles Focus mode (temporary workspace mode).
  document.addEventListener("keydown", function (e) {
    try {
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === "f" || e.key === "F")) {
        e.preventDefault();
        chrome.storage.sync.get("simplify", function (s) {
          var cur = (s && s.simplify) || "off";
          chrome.storage.sync.set({ simplify: cur === "focus" ? "off" : "focus" });
        });
      }
    } catch (err) {}
  });

  document.addEventListener("turbo:load", onNavigate);
  document.addEventListener("turbo:render", onNavigate);
  document.addEventListener("pjax:end", onNavigate);
  setInterval(function () {
    if (location.href !== lastUrl) onNavigate();
  }, 700);

  applyAll();
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", applyAll);
  }
})();
