/**
 * OCTANE popup logic — v0.5.0
 *
 * ALL settings live in chrome.storage.local (theme, accent, simplify, tips,
 * fx, hideHScroll, vScroll, bg, custom, bgImage).
 *
 * v0.5.0 fix: settings used to live in chrome.storage.sync, which enforces
 * a hard quota of ~120 writes/minute. Dragging a color picker fires dozens
 * of writes per second, so the quota blew in seconds and every later write
 * silently failed — customizing "worked for a moment, then broke". local
 * storage has no such rate limit (plus we hold unlimitedStorage). Writes
 * are also debounced now, and old sync data is migrated over once.
 *
 * Editing ANY color in the Custom tab applies the custom theme immediately
 * (theme is switched to "custom" as you tweak), so there is no separate
 * "apply" step to miss.
 */
(function () {
  "use strict";

  var GHX = self.GHX;
  var S = Object.assign(GHX.clone(GHX.DEFAULTS), { bgImage: "" });

  var HINTS = {
    off: "GitHub exactly as-is \u2014 everything stays.",
    gentle: "Less clutter, same GitHub. Hides promos, Releases, Packages and Deployments; dims stars, forks and sidebar metadata.",
    focus: "Code first, noise hidden. Strips social & popularity metrics, discovery links and extra tabs \u2014 keeps Code, files and the README."
  };

  var els = {};
  var COLOR_PRESETS = ["#0d1117", "#1a0506", "#ffffff", "#f6f8fa", "#5b7cfa", "#bd93f9", "#3fb950", "#f7b955"];

  function $(id) { return document.getElementById(id); }

  function cacheEls() {
    ["themes", "accent", "accentHex", "accentClear", "simplify", "simplifyHint",
     "tips", "fx", "hscroll", "vscroll", "reset", "bgType", "bgHint", "bgImageCtl", "bgUpload", "bgRemoveImg",
     "bgFile", "bgUrl", "bgPreview", "bgGradientCtl", "bgC1", "bgC2",
     "gradientChips", "bgAngle", "bgAngleVal", "bgColorCtl", "bgColor",
     "colorChips", "bgFadeCtl", "bgFade", "bgFadeVal", "bgPreviewBig",
     "customBase", "customFields", "customApply", "customReset", "toast"
    ].forEach(function (id) { els[id] = $(id); });
  }

  /* Debounced writes: color pickers fire dozens of `input` events per
   * second while dragging. We coalesce them into one storage write every
   * 150ms (trailing), so the page updates near-live without ever spamming
   * the storage layer. */
  var pending = {};
  var flushTimer = null;
  function flush() {
    flushTimer = null;
    var payload = pending;
    pending = {};
    try { chrome.storage.local.set(payload); } catch (e) {}
  }
  function store(p) {
    Object.assign(pending, p);
    if (!flushTimer) flushTimer = setTimeout(flush, 150);
  }
  // If the popup closes mid-debounce, push whatever is pending immediately.
  document.addEventListener("visibilitychange", function () {
    if (document.hidden && flushTimer) { clearTimeout(flushTimer); flush(); }
  });
  window.addEventListener("pagehide", function () {
    if (flushTimer) { clearTimeout(flushTimer); flush(); }
  });
  // keep old call-sites working — everything goes to storage.local now
  function syncSet(p) { store(p); }
  function localSet(p) { store(p); }

  function load(cb) {
    chrome.storage.local.get(null, function (l) {
      l = l || {};
      if (l.__migrated || typeof l.theme === "string") {
        S = GHX.normalizeSettings(l);
        S.bgImage = l.bgImage || "";
        cb();
        return;
      }
      // One-time migration from the old storage.sync home.
      chrome.storage.sync.get(null, function (sy) {
        sy = sy || {};
        S = GHX.normalizeSettings(sy);
        S.bgImage = l.bgImage || "";
        try { chrome.storage.local.set(Object.assign({}, sy, { __migrated: true })); } catch (e) {}
        cb();
      });
    });
  }

  function saveBg() { store({ bg: S.bg }); }
  function saveCustom() { store({ custom: S.custom, theme: "custom" }); }

  var toastTimer = null;
  function toast(msg) {
    els.toast.textContent = msg;
    els.toast.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { els.toast.classList.remove("show"); }, 1600);
  }

  function hexValid(v) { return /^#?[0-9a-f]{6}$/i.test((v || "").trim()); }
  function normHex(v) { v = (v || "").trim(); return v[0] === "#" ? v.toLowerCase() : "#" + v.toLowerCase(); }

  /* ------------------------------------------------------------------ *
   * THEME TAB
   * ------------------------------------------------------------------ */
  function swatch(v, fallback) { return '<i style="background:' + (v || fallback) + '"></i>'; }

  function customVarsForPreview() {
    var base = S.custom.base === "light" ? "light" : "dark";
    return GHX.buildCustomVars(base, Object.assign({}, GHX.CUSTOM_BASES[base], S.custom.colors || {}));
  }

  function themeCardHtml(meta) {
    return '<span class="swatches">' +
      swatch(meta.vars["--bgColor-default"], "#888") +
      swatch(meta.vars["--bgColor-muted"], "#999") +
      swatch(meta.vars["--accent-emphasis"], "#555") +
      "</span>" +
      '<span class="row-meta"><span class="name">' + meta.name + "</span>" +
      '<span class="meta">' + meta.base + "</span></span>" +
      '<span class="check"><svg viewBox="0 0 10 8"><path d="M1 4.2 3.6 6.8 9 1.2" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg></span>';
  }

  function makeThemeCard(id, name, base, vars, selected) {
    var card = document.createElement("button");
    card.type = "button";
    card.className = "card";
    card.setAttribute("role", "radio");
    card.setAttribute("aria-checked", String(selected));
    card.setAttribute("aria-pressed", String(selected));
    card.innerHTML = themeCardHtml({ name: name, base: base, vars: vars });
    card.addEventListener("click", function () {
      S.theme = id;
      syncSet({ theme: id });
      renderThemes();
      toast(id === "custom" ? "Custom theme applied" : name + " applied");
    });
    return card;
  }

  function renderThemes() {
    els.themes.innerHTML = "";
    GHX.THEMES.forEach(function (t) {
      els.themes.appendChild(makeThemeCard(t.id, t.name, t.base, t.vars, S.theme === t.id));
    });
    var cv = customVarsForPreview();
    els.themes.appendChild(makeThemeCard("custom", "My custom", S.custom.base, cv, S.theme === "custom"));
  }

  function renderAccent() {
    var val = hexValid(S.accent) ? normHex(S.accent) : "#5b7cfa";
    els.accent.value = val;
    els.accentHex.value = S.accent || "";
  }

  function renderSimplify() {
    els.simplify.querySelectorAll("button").forEach(function (b) {
      b.setAttribute("aria-pressed", String(b.dataset.v === S.simplify));
    });
    els.simplifyHint.textContent = HINTS[S.simplify] || "";
  }

  function bindThemeTab() {
    els.accent.addEventListener("input", function () {
      els.accentHex.value = els.accent.value;
      S.accent = els.accent.value;
      syncSet({ accent: S.accent });
    });

    els.accentHex.addEventListener("change", function () {
      if (!els.accentHex.value) { S.accent = ""; syncSet({ accent: "" }); renderAccent(); return; }
      if (hexValid(els.accentHex.value)) {
        S.accent = normHex(els.accentHex.value);
        syncSet({ accent: S.accent });
        renderAccent();
        toast("Accent saved");
      } else {
        renderAccent();
      }
    });

    els.accentClear.addEventListener("click", function () {
      S.accent = "";
      syncSet({ accent: "" });
      renderAccent();
    });

    els.simplify.querySelectorAll("button").forEach(function (b) {
      b.addEventListener("click", function () {
        S.simplify = b.dataset.v;
        syncSet({ simplify: S.simplify });
        renderSimplify();
      });
    });

    els.tips.addEventListener("change", function () {
      S.tips = els.tips.checked;
      syncSet({ tips: S.tips });
    });

    els.fx.addEventListener("change", function () {
      S.fx = els.fx.checked;
      syncSet({ fx: S.fx });
    });
  }

  /* ------------------------------------------------------------------ *
   * BACKGROUND TAB
   * ------------------------------------------------------------------ */
  function bgCss(useImage) {
    var bg = S.bg;
    if (!bg.type || bg.type === "none") return "";
    if (bg.type === "color") return "background-color: " + bg.color;
    if (bg.type === "gradient") {
      return "background-image: linear-gradient(" + (bg.angle || 135) + "deg, " + bg.c1 + ", " + bg.c2 + ")";
    }
    if (bg.type === "image") {
      var src = useImage ? (S.bgImage || bg.url || "") : (bg.url || "");
      return src ? "background-image: url(\"" + src + "\")" : "";
    }
    return "";
  }

  function applyBgPreview(el, useImage) {
    var css = bgCss(useImage);
    if (css) {
      el.style.cssText += ";" + css + ";background-size:cover;background-position:center;";
    } else {
      el.style.backgroundImage = "";
      el.style.backgroundColor = "";
    }
  }

  function renderBackground() {
    var type = S.bg.type || "none";

    els.bgType.querySelectorAll("button").forEach(function (b) {
      b.setAttribute("aria-pressed", String(b.dataset.v === type));
    });

    els.bgImageCtl.hidden = type !== "image";
    els.bgGradientCtl.hidden = type !== "gradient";
    els.bgColorCtl.hidden = type !== "color";
    els.bgFadeCtl.hidden = (type !== "image" && type !== "gradient");

    els.bgUrl.value = S.bg.url || "";
    els.bgC1.value = S.bg.c1 || "#5b7cfa";
    els.bgC2.value = S.bg.c2 || "#bd93f9";
    els.bgAngle.value = S.bg.angle || 135;
    els.bgAngleVal.textContent = (S.bg.angle || 135) + "°";
    els.bgColor.value = S.bg.color || "#0d1117";
    els.bgFade.value = S.bg.fade == null ? 20 : S.bg.fade;
    els.bgFadeVal.textContent = (S.bg.fade == null ? 20 : S.bg.fade) + "%";

    els.gradientChips.innerHTML = "";
    GHX.GRADIENTS.forEach(function (g) {
      var chip = document.createElement("button");
      chip.type = "button";
      chip.className = "chip";
      chip.innerHTML = '<i style="background:linear-gradient(135deg,' + g.c1 + "," + g.c2 + ')"></i>' + g.name;
      chip.addEventListener("click", function () {
        S.bg.type = "gradient";
        S.bg.c1 = g.c1; S.bg.c2 = g.c2; S.bg.angle = g.angle;
        saveBg();
        renderBackground();
        toast(g.name + " gradient");
      });
      els.gradientChips.appendChild(chip);
    });

    els.colorChips.innerHTML = "";
    COLOR_PRESETS.forEach(function (c) {
      var chip = document.createElement("button");
      chip.type = "button";
      chip.className = "chip";
      chip.innerHTML = '<i style="background:' + c + '"></i>' + c;
      chip.addEventListener("click", function () {
        S.bg.type = "color";
        S.bg.color = c;
        saveBg();
        renderBackground();
      });
      els.colorChips.appendChild(chip);
    });

    applyBgPreview(els.bgPreview, true);
    applyBgPreview(els.bgPreviewBig, true);
    els.bgPreview.querySelector(".placeholder").style.display =
      (type === "image" && !S.bgImage && !S.bg.url) ? "flex" : "none";
    els.bgPreviewBig.querySelector(".placeholder").style.display =
      bgCss(true) ? "none" : "flex";
  }

  function processImageFile(file) {
    var reader = new FileReader();
    reader.onload = function () {
      var img = new Image();
      img.onload = function () {
        var max = 1600;
        var scale = Math.min(1, max / Math.max(img.width, img.height));
        var w = Math.max(1, Math.round(img.width * scale));
        var h = Math.max(1, Math.round(img.height * scale));
        var canvas = document.createElement("canvas");
        canvas.width = w; canvas.height = h;
        canvas.getContext("2d").drawImage(img, 0, 0, w, h);
        var data = canvas.toDataURL("image/jpeg", 0.85);
        localSet({ bgImage: data });
        S.bgImage = data;
        S.bg.type = "image";
        saveBg();
        renderBackground();
        toast("Wallpaper saved");
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  }

  function bindBackgroundTab() {
    els.bgType.querySelectorAll("button").forEach(function (b) {
      b.addEventListener("click", function () {
        S.bg.type = b.dataset.v;
        saveBg();
        renderBackground();
      });
    });

    els.bgUpload.addEventListener("click", function () { els.bgFile.click(); });
    els.bgFile.addEventListener("change", function () {
      if (els.bgFile.files && els.bgFile.files[0]) processImageFile(els.bgFile.files[0]);
      els.bgFile.value = "";
    });

    els.bgRemoveImg.addEventListener("click", function () {
      localSet({ bgImage: "" });
      S.bgImage = "";
      if (!S.bg.url) S.bg.type = "none";
      saveBg();
      renderBackground();
      toast("Wallpaper removed");
    });

    els.bgUrl.addEventListener("change", function () {
      S.bg.url = els.bgUrl.value.trim();
      if (S.bg.url && S.bg.type !== "image") S.bg.type = "image";
      saveBg();
      renderBackground();
    });

    els.bgC1.addEventListener("input", function () { S.bg.c1 = els.bgC1.value; saveBg(); renderBackground(); });
    els.bgC2.addEventListener("input", function () { S.bg.c2 = els.bgC2.value; saveBg(); renderBackground(); });
    els.bgAngle.addEventListener("input", function () {
      S.bg.angle = Number(els.bgAngle.value);
      els.bgAngleVal.textContent = S.bg.angle + "°";
      saveBg();
      applyBgPreview(els.bgPreviewBig, false);
    });
    els.bgColor.addEventListener("input", function () { S.bg.color = els.bgColor.value; saveBg(); renderBackground(); });
    els.bgFade.addEventListener("input", function () {
      S.bg.fade = Number(els.bgFade.value);
      els.bgFadeVal.textContent = S.bg.fade + "%";
      saveBg();
    });
  }

  /* ------------------------------------------------------------------ *
   * CUSTOM TAB — edits apply the custom theme immediately
   * ------------------------------------------------------------------ */
  function renderCustom() {
    var base = S.custom.base === "light" ? "light" : "dark";
    els.customBase.querySelectorAll("button").forEach(function (b) {
      b.setAttribute("aria-pressed", String(b.dataset.v === base));
    });

    els.customFields.innerHTML = "";
    var colors = S.custom.colors || {};
    GHX.CUSTOM_FIELDS.forEach(function (f) {
      var row = document.createElement("div");
      row.className = "cfield";
      var color = colors[f.key] || GHX.CUSTOM_BASES[base][f.key];

      var lab = document.createElement("span");
      lab.className = "lab";
      lab.textContent = f.label;

      var picker = document.createElement("input");
      picker.type = "color";
      picker.value = color;

      var hex = document.createElement("input");
      hex.type = "text";
      hex.maxLength = 7;
      hex.value = color;
      hex.spellcheck = false;

      picker.addEventListener("input", function () {
        hex.value = picker.value;
        setCustomColor(f.key, picker.value);
      });
      hex.addEventListener("change", function () {
        if (hexValid(hex.value)) {
          var h = normHex(hex.value);
          picker.value = h;
          setCustomColor(f.key, h);
        } else {
          hex.value = picker.value;
        }
      });

      row.appendChild(lab);
      row.appendChild(picker);
      row.appendChild(hex);
      els.customFields.appendChild(row);
    });
  }

  function setCustomColor(key, value) {
    S.custom.colors[key] = value;
    S.theme = "custom";
    saveCustom(); // stores custom + theme=custom, so it applies live
    renderThemes();
  }

  function bindCustomTab() {
    els.customBase.querySelectorAll("button").forEach(function (b) {
      b.addEventListener("click", function () {
        var base = b.dataset.v;
        S.custom.base = base;
        S.custom.colors = Object.assign({}, GHX.CUSTOM_BASES[base]);
        S.theme = "custom";
        saveCustom();
        renderCustom();
        renderThemes();
      });
    });

    els.customApply.addEventListener("click", function () {
      S.theme = "custom";
      saveCustom();
      renderThemes();
      toast("Custom theme applied");
    });

    els.customReset.addEventListener("click", function () {
      var base = S.custom.base === "light" ? "light" : "dark";
      S.custom.colors = Object.assign({}, GHX.CUSTOM_BASES[base]);
      S.theme = "custom";
      saveCustom();
      renderCustom();
      renderThemes();
      toast("Custom palette reset");
    });

    els.hscroll.addEventListener("change", function () {
      S.hideHScroll = els.hscroll.checked;
      store({ hideHScroll: S.hideHScroll });
    });

    els.vscroll.addEventListener("change", function () {
      S.vScroll = els.vscroll.checked;
      store({ vScroll: S.vScroll });
    });
  }

  /* ------------------------------------------------------------------ *
   * tabs + reset
   * ------------------------------------------------------------------ */
  function bindTabs() {
    var tabs = document.querySelectorAll("nav.tabs button");
    tabs.forEach(function (t) {
      t.addEventListener("click", function () {
        tabs.forEach(function (x) { x.setAttribute("aria-selected", "false"); });
        t.setAttribute("aria-selected", "true");
        ["theme", "background", "custom"].forEach(function (name) {
          $("panel-" + name).hidden = t.dataset.tab !== name;
        });
      });
    });
  }

  function bindReset() {
    els.reset.addEventListener("click", function () {
      store(Object.assign(GHX.clone(GHX.DEFAULTS), { bgImage: "", __migrated: true }));
      S = Object.assign(GHX.clone(GHX.DEFAULTS), { bgImage: "" });
      renderAll();
      toast("Everything reset");
    });
  }

  function renderAll() {
    renderThemes();
    renderAccent();
    renderSimplify();
    els.tips.checked = !!S.tips;
    els.fx.checked = S.fx !== false;
    els.hscroll.checked = !!S.hideHScroll;
    els.vscroll.checked = S.vScroll !== false;
    renderBackground();
    renderCustom();
  }

  function init() {
    cacheEls();
    bindTabs();
    bindThemeTab();
    bindBackgroundTab();
    bindCustomTab();
    bindReset();
    load(renderAll);
  }

  init();
})();
