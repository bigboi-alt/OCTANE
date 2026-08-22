/**
 * OCTANE — shared theme definitions.
 *
 * Loaded by BOTH the content script and the popup, so theme data lives in
 * exactly one place. Exposes a single `self.GHX` namespace.
 *
 * Themes are defined as sets of GitHub's CSS custom properties (Primer's
 * "--bgColor-*" / "--fgColor-*" functional variables). A small alias map
 * mirrors each value onto the legacy "--color-*" names so the themes keep
 * working across GitHub's UI changes.
 */
(function (root) {
  "use strict";

  /* ------------------------------------------------------------------ *
   * Legacy aliases — new Primer variable name -> older "--color-*" names
   * ------------------------------------------------------------------ */
  var ALIASES = {
    "--bgColor-default": ["--color-canvas-default", "--bgColor-canvas"],
    "--bgColor-muted": ["--color-canvas-subtle"],
    "--bgColor-inset": ["--color-canvas-inset"],
    "--fgColor-default": ["--color-fg-default"],
    "--fgColor-muted": ["--color-fg-muted"],
    "--fgColor-subtle": ["--color-fg-subtle"],
    "--accent-fgColor": ["--color-accent-fg", "--fgColor-accent", "--fgColor-link"],
    "--accent-emphasis": ["--color-accent-emphasis"],
    "--accent-muted": ["--color-accent-muted"],
    "--accent-subtle": ["--color-accent-subtle"],
    "--borderColor-default": ["--color-border-default"],
    "--borderColor-muted": ["--color-border-muted"],
    "--borderColor-subtle": ["--color-border-subtle"],
    "--btn-primary-bg": ["--color-btn-primary-bg"],
    "--btn-primary-fg": ["--color-btn-primary-text", "--btn-primary-fgColor"],
    "--btn-primary-hover-bg": ["--color-btn-primary-hover-bg"],
    "--btn-bg": ["--color-btn-bg"],
    "--btn-fg": ["--color-btn-text"],
    "--btn-border": ["--color-btn-border"],
    "--btn-hover-bg": ["--color-btn-hover-bg"],
    "--btn-active-bg": ["--color-btn-active-bg"],
    "--btn-selected-bg": ["--color-btn-selected-bg"],
    "--header-bgColor": ["--color-header-bg", "--page-header-bgColor", "--color-page-header-bg"],
    "--header-fgColor": ["--color-header-text", "--header-fgColor-default"],
    "--header-search-bg": ["--color-header-search-bg"],
    "--header-search-border": ["--color-header-search-border"],
    "--bgColor-emphasis": [],
    "--bgColor-canvas": []
  };

  function expand(vars) {
    var out = Object.assign({}, vars);
    Object.keys(ALIASES).forEach(function (key) {
      if (!(key in vars)) return;
      ALIASES[key].forEach(function (alias) {
        if (!(alias in out)) out[alias] = vars[key];
      });
    });
    return out;
  }

  /* ------------------------------------------------------------------ *
   * Color helpers
   * ------------------------------------------------------------------ */
  function hexToRgb(hex) {
    hex = String(hex || "").replace("#", "");
    if (hex.length === 3) {
      hex = hex.split("").map(function (c) { return c + c; }).join("");
    }
    if (!/^[0-9a-f]{6}$/i.test(hex)) return null;
    var n = parseInt(hex, 16);
    return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
  }

  function luminance(hex) {
    var rgb = hexToRgb(hex);
    if (!rgb) return 0;
    var c = [rgb.r, rgb.g, rgb.b].map(function (v) {
      v /= 255;
      return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
  }

  /** Pick dark or light text that stays readable on the given background.
   *  The 0.179 relative-luminance boundary is where white vs. black text
   *  have equal WCAG contrast, so it picks the more readable option. */
  function readableText(hex) {
    return luminance(hex) > 0.179 ? "#1f2328" : "#ffffff";
  }

  /** Darken (factor < 0) or lighten (factor > 0) a hex color. */
  function shade(hex, factor) {
    var rgb = hexToRgb(hex);
    if (!rgb) return hex;
    var keys = ["r", "g", "b"];
    keys.forEach(function (k) {
      rgb[k] = Math.max(0, Math.min(255, Math.round(rgb[k] * (1 + factor))));
    });
    return "#" + [rgb.r, rgb.g, rgb.b].map(function (v) {
      return ("0" + v.toString(16)).slice(-2);
    }).join("");
  }

  /* ------------------------------------------------------------------ *
   * Custom theme builder — "any color scheme you want"
   * ------------------------------------------------------------------ */

  /** Fields exposed in the Custom tab. `key` maps to a color in
   *  CUSTOM_BASES below. */
  var CUSTOM_FIELDS = [
    { key: "bg", label: "Page background" },
    { key: "surface", label: "Cards & panels" },
    { key: "fg", label: "Text" },
    { key: "fgMuted", label: "Muted text" },
    { key: "border", label: "Borders" },
    { key: "accent", label: "Accent & links" },
    { key: "btn", label: "Primary button" },
    { key: "headerBg", label: "Header background" }
  ];

  var CUSTOM_BASES = {
    light: {
      bg: "#ffffff", surface: "#f6f8fa", fg: "#1f2328", fgMuted: "#59636e",
      border: "#d1d9e0", accent: "#0969da", btn: "#1f883d", headerBg: "#ffffff"
    },
    dark: {
      bg: "#0d1117", surface: "#161b22", fg: "#e6edf3", fgMuted: "#8b949e",
      border: "#30363d", accent: "#58a6ff", btn: "#238636", headerBg: "#0d1117"
    }
  };

  /** Derive a full set of GitHub CSS variables from the user's hand-picked
   *  colors. Everything the user didn't set is derived so the theme always
   *  looks coherent. */
  function buildCustomVars(base, colors) {
    base = base === "light" ? "light" : "dark";
    var dark = base === "dark";
    var defs = CUSTOM_BASES[base];
    var c = Object.assign({}, defs, colors || {});
    var accent = c.accent || "#0969da";
    var btn = c.btn || accent;
    var vars = {
      "--bgColor-default": c.bg,
      "--bgColor-muted": c.surface,
      "--bgColor-inset": shade(c.bg, dark ? -0.10 : -0.04),
      "--bgColor-emphasis": shade(c.surface, dark ? 0.10 : -0.05),
      "--fgColor-default": c.fg,
      "--fgColor-muted": c.fgMuted,
      "--fgColor-subtle": shade(c.fgMuted, dark ? -0.18 : 0.12),
      "--borderColor-default": c.border,
      "--borderColor-muted": shade(c.border, dark ? -0.16 : 0.06),
      "--borderColor-subtle": shade(c.border, dark ? -0.16 : 0.06),
      "--accent-fgColor": accent,
      "--accent-emphasis": accent,
      "--accent-muted": accent + "55",
      "--accent-subtle": accent + "1f",
      "--btn-primary-bg": btn,
      "--btn-primary-fg": readableText(btn),
      "--btn-primary-hover-bg": shade(btn, dark ? 0.12 : -0.12),
      "--btn-primary-border": btn,
      "--btn-bg": c.surface,
      "--btn-fg": c.fg,
      "--btn-border": c.border,
      "--btn-hover-bg": shade(c.surface, dark ? 0.06 : -0.05),
      "--btn-active-bg": shade(c.surface, dark ? 0.10 : -0.08),
      "--btn-selected-bg": shade(c.surface, dark ? 0.10 : -0.08),
      "--header-bgColor": c.headerBg,
      "--header-fgColor": readableText(c.headerBg),
      "--header-search-bg": c.surface,
      "--header-search-border": c.border
    };
    return expand(vars);
  }

  /* ------------------------------------------------------------------ *
   * Background presets (gradients) — used by the Background tab + demo
   * ------------------------------------------------------------------ */
  var GRADIENTS = [
    { id: "aurora", name: "Aurora", c1: "#5b7cfa", c2: "#bd93f9", angle: 135 },
    { id: "sunset", name: "Sunset", c1: "#ff9a5a", c2: "#d6336c", angle: 120 },
    { id: "ocean", name: "Ocean", c1: "#0f7fb0", c2: "#34d399", angle: 160 },
    { id: "kinbeni", name: "Kin-Beni", c1: "#7a1519", c2: "#d4a13c", angle: 135 },
    { id: "ember", name: "Ember", c1: "#7f1d1d", c2: "#f59e0b", angle: 130 },
    { id: "mono", name: "Mono", c1: "#2b2f3a", c2: "#0d1117", angle: 160 }
  ];

  /* ------------------------------------------------------------------ *
   * Themes
   * ------------------------------------------------------------------ */
  var THEMES = [
    {
      id: "github-light",
      name: "GitHub Light",
      base: "light",
      vars: expand({
        "--bgColor-default": "#ffffff",
        "--bgColor-muted": "#f6f8fa",
        "--bgColor-inset": "#f6f8fa",
        "--bgColor-emphasis": "#24292f",
        "--fgColor-default": "#1f2328",
        "--fgColor-muted": "#59636e",
        "--fgColor-subtle": "#818b98",
        "--borderColor-default": "#d1d9e0",
        "--borderColor-muted": "#d1d9e0",
        "--borderColor-subtle": "#d1d9e0",
        "--accent-fgColor": "#0969da",
        "--accent-emphasis": "#0969da",
        "--accent-muted": "#54aeff66",
        "--accent-subtle": "#ddf4ff",
        "--btn-primary-bg": "#1f883d",
        "--btn-primary-fg": "#ffffff",
        "--btn-primary-hover-bg": "#1a7f37",
        "--btn-primary-border": "#1f883d",
        "--btn-bg": "#f6f8fa",
        "--btn-fg": "#1f2328",
        "--btn-border": "#d1d9e0",
        "--btn-hover-bg": "#f3f4f6",
        "--btn-active-bg": "#eaeef2",
        "--btn-selected-bg": "#eaeef2",
        "--header-bgColor": "#ffffff",
        "--header-fgColor": "#1f2328",
        "--header-search-bg": "#f6f8fa",
        "--header-search-border": "#d1d9e0"
      })
    },
    {
      id: "github-dark",
      name: "GitHub Dark",
      base: "dark",
      vars: expand({
        "--bgColor-default": "#0d1117",
        "--bgColor-muted": "#161b22",
        "--bgColor-inset": "#010409",
        "--bgColor-emphasis": "#6e7681",
        "--fgColor-default": "#e6edf3",
        "--fgColor-muted": "#8b949e",
        "--fgColor-subtle": "#6e7681",
        "--borderColor-default": "#30363d",
        "--borderColor-muted": "#21262d",
        "--borderColor-subtle": "#21262d",
        "--accent-fgColor": "#58a6ff",
        "--accent-emphasis": "#1f6feb",
        "--accent-muted": "#388bfd66",
        "--accent-subtle": "#388bfd1a",
        "--btn-primary-bg": "#238636",
        "--btn-primary-fg": "#ffffff",
        "--btn-primary-hover-bg": "#2ea043",
        "--btn-primary-border": "#238636",
        "--btn-bg": "#21262d",
        "--btn-fg": "#c9d1d9",
        "--btn-border": "#30363d",
        "--btn-hover-bg": "#30363d",
        "--btn-active-bg": "#30363d",
        "--btn-selected-bg": "#30363d",
        "--header-bgColor": "#0d1117",
        "--header-fgColor": "#e6edf3",
        "--header-search-bg": "#0d1117",
        "--header-search-border": "#30363d"
      })
    },
    {
      id: "paper",
      name: "Paper",
      base: "light",
      vars: expand({
        "--bgColor-default": "#fbfaf7",
        "--bgColor-muted": "#f3f1ea",
        "--bgColor-inset": "#efede3",
        "--bgColor-emphasis": "#3d3929",
        "--fgColor-default": "#2b2a24",
        "--fgColor-muted": "#6b675c",
        "--fgColor-subtle": "#97917f",
        "--borderColor-default": "#e4dfd2",
        "--borderColor-muted": "#eae5d9",
        "--borderColor-subtle": "#eae5d9",
        "--accent-fgColor": "#4f46e5",
        "--accent-emphasis": "#4f46e5",
        "--accent-muted": "#4f46e533",
        "--accent-subtle": "#eef2ff",
        "--btn-primary-bg": "#4f46e5",
        "--btn-primary-fg": "#ffffff",
        "--btn-primary-hover-bg": "#4338ca",
        "--btn-primary-border": "#4f46e5",
        "--btn-bg": "#f3f1ea",
        "--btn-fg": "#2b2a24",
        "--btn-border": "#e4dfd2",
        "--btn-hover-bg": "#eae5d9",
        "--btn-active-bg": "#e2ddcf",
        "--btn-selected-bg": "#e2ddcf",
        "--header-bgColor": "#fbfaf7",
        "--header-fgColor": "#2b2a24",
        "--header-search-bg": "#f3f1ea",
        "--header-search-border": "#e4dfd2"
      })
    },
    {
      id: "midnight",
      name: "Midnight",
      base: "dark",
      vars: expand({
        "--bgColor-default": "#0b0f1a",
        "--bgColor-muted": "#111726",
        "--bgColor-inset": "#070a12",
        "--bgColor-emphasis": "#3d4663",
        "--fgColor-default": "#e6e9f2",
        "--fgColor-muted": "#8b93a7",
        "--fgColor-subtle": "#5f6b85",
        "--borderColor-default": "#232a3d",
        "--borderColor-muted": "#1b2130",
        "--borderColor-subtle": "#1b2130",
        "--accent-fgColor": "#7aa2f7",
        "--accent-emphasis": "#5b7cfa",
        "--accent-muted": "#5b7cfa55",
        "--accent-subtle": "#5b7cfa1f",
        "--btn-primary-bg": "#5b7cfa",
        "--btn-primary-fg": "#0b0f1a",
        "--btn-primary-hover-bg": "#7591fb",
        "--btn-primary-border": "#5b7cfa",
        "--btn-bg": "#171d2f",
        "--btn-fg": "#c7cde0",
        "--btn-border": "#232a3d",
        "--btn-hover-bg": "#1f2739",
        "--btn-active-bg": "#1f2739",
        "--btn-selected-bg": "#1f2739",
        "--header-bgColor": "#0b0f1a",
        "--header-fgColor": "#e6e9f2",
        "--header-search-bg": "#111726",
        "--header-search-border": "#232a3d"
      })
    },
    {
      id: "nord",
      name: "Nord",
      base: "dark",
      vars: expand({
        "--bgColor-default": "#2e3440",
        "--bgColor-muted": "#3b4252",
        "--bgColor-inset": "#272c36",
        "--bgColor-emphasis": "#4c566a",
        "--fgColor-default": "#eceff4",
        "--fgColor-muted": "#d8dee9",
        "--fgColor-subtle": "#a5b0c2",
        "--borderColor-default": "#434c5e",
        "--borderColor-muted": "#3b4252",
        "--borderColor-subtle": "#3b4252",
        "--accent-fgColor": "#88c0d0",
        "--accent-emphasis": "#5e81ac",
        "--accent-muted": "#81a1c166",
        "--accent-subtle": "#81a1c133",
        "--btn-primary-bg": "#5e81ac",
        "--btn-primary-fg": "#eceff4",
        "--btn-primary-hover-bg": "#6d90ba",
        "--btn-primary-border": "#5e81ac",
        "--btn-bg": "#3b4252",
        "--btn-fg": "#eceff4",
        "--btn-border": "#434c5e",
        "--btn-hover-bg": "#434c5e",
        "--btn-active-bg": "#434c5e",
        "--btn-selected-bg": "#434c5e",
        "--header-bgColor": "#2e3440",
        "--header-fgColor": "#eceff4",
        "--header-search-bg": "#3b4252",
        "--header-search-border": "#434c5e"
      })
    },
    {
      id: "solarized-dark",
      name: "Solarized Dark",
      base: "dark",
      vars: expand({
        "--bgColor-default": "#002b36",
        "--bgColor-muted": "#073642",
        "--bgColor-inset": "#00222b",
        "--bgColor-emphasis": "#586e75",
        "--fgColor-default": "#93a1a1",
        "--fgColor-muted": "#839496",
        "--fgColor-subtle": "#657b83",
        "--borderColor-default": "#114b5a",
        "--borderColor-muted": "#0b3a46",
        "--borderColor-subtle": "#0b3a46",
        "--accent-fgColor": "#268bd2",
        "--accent-emphasis": "#268bd2",
        "--accent-muted": "#268bd255",
        "--accent-subtle": "#268bd21f",
        "--btn-primary-bg": "#268bd2",
        "--btn-primary-fg": "#002b36",
        "--btn-primary-hover-bg": "#3a97d8",
        "--btn-primary-border": "#268bd2",
        "--btn-bg": "#073642",
        "--btn-fg": "#93a1a1",
        "--btn-border": "#114b5a",
        "--btn-hover-bg": "#0b4a5a",
        "--btn-active-bg": "#0b4a5a",
        "--btn-selected-bg": "#0b4a5a",
        "--header-bgColor": "#002b36",
        "--header-fgColor": "#93a1a1",
        "--header-search-bg": "#073642",
        "--header-search-border": "#114b5a"
      })
    },
    {
      id: "nocturne",
      name: "Nocturne",
      base: "dark",
      vars: expand({
        "--bgColor-default": "#282a36",
        "--bgColor-muted": "#2f3140",
        "--bgColor-inset": "#21222c",
        "--bgColor-emphasis": "#44475a",
        "--fgColor-default": "#f8f8f2",
        "--fgColor-muted": "#bfc7d5",
        "--fgColor-subtle": "#6272a4",
        "--borderColor-default": "#44475a",
        "--borderColor-muted": "#3a3c4c",
        "--borderColor-subtle": "#3a3c4c",
        "--accent-fgColor": "#bd93f9",
        "--accent-emphasis": "#bd93f9",
        "--accent-muted": "#bd93f955",
        "--accent-subtle": "#bd93f91f",
        "--btn-primary-bg": "#bd93f9",
        "--btn-primary-fg": "#282a36",
        "--btn-primary-hover-bg": "#c8a2fa",
        "--btn-primary-border": "#bd93f9",
        "--btn-bg": "#343746",
        "--btn-fg": "#f8f8f2",
        "--btn-border": "#44475a",
        "--btn-hover-bg": "#44475a",
        "--btn-active-bg": "#44475a",
        "--btn-selected-bg": "#44475a",
        "--header-bgColor": "#282a36",
        "--header-fgColor": "#f8f8f2",
        "--header-search-bg": "#2f3140",
        "--header-search-border": "#44475a"
      })
    },
    {
      id: "sakura",
      name: "Sakura",
      base: "light",
      vars: expand({
        "--bgColor-default": "#fffbfc",
        "--bgColor-muted": "#fff1f5",
        "--bgColor-inset": "#ffe9f0",
        "--bgColor-emphasis": "#5c333f",
        "--fgColor-default": "#3b2b32",
        "--fgColor-muted": "#8a7078",
        "--fgColor-subtle": "#b39aa2",
        "--borderColor-default": "#f6d5e0",
        "--borderColor-muted": "#f9e0e8",
        "--borderColor-subtle": "#f9e0e8",
        "--accent-fgColor": "#d6336c",
        "--accent-emphasis": "#d6336c",
        "--accent-muted": "#d6336c33",
        "--accent-subtle": "#fff0f6",
        "--btn-primary-bg": "#d6336c",
        "--btn-primary-fg": "#ffffff",
        "--btn-primary-hover-bg": "#c2255c",
        "--btn-primary-border": "#d6336c",
        "--btn-bg": "#fff1f5",
        "--btn-fg": "#3b2b32",
        "--btn-border": "#f6d5e0",
        "--btn-hover-bg": "#ffe9f0",
        "--btn-active-bg": "#ffe0ea",
        "--btn-selected-bg": "#ffe0ea",
        "--header-bgColor": "#fffbfc",
        "--header-fgColor": "#3b2b32",
        "--header-search-bg": "#fff1f5",
        "--header-search-border": "#f6d5e0"
      })
    },
    {
      id: "kinbeni",
      name: "Kin-Beni",
      base: "dark",
      vars: expand({
        "--bgColor-default": "#1a0506",
        "--bgColor-muted": "#2a0c0d",
        "--bgColor-inset": "#120304",
        "--bgColor-emphasis": "#572022",
        "--fgColor-default": "#f0e7d8",
        "--fgColor-muted": "#c0a98f",
        "--fgColor-subtle": "#8f7768",
        "--borderColor-default": "#572022",
        "--borderColor-muted": "#3a1416",
        "--borderColor-subtle": "#3a1416",
        "--accent-fgColor": "#d4a13c",
        "--accent-emphasis": "#c9972f",
        "--accent-muted": "#d4a13c55",
        "--accent-subtle": "#d4a13c1f",
        "--btn-primary-bg": "#b32329",
        "--btn-primary-fg": "#ffffff",
        "--btn-primary-hover-bg": "#c73a3f",
        "--btn-primary-border": "#b32329",
        "--btn-bg": "#2a0c0d",
        "--btn-fg": "#f0e7d8",
        "--btn-border": "#572022",
        "--btn-hover-bg": "#331112",
        "--btn-active-bg": "#331112",
        "--btn-selected-bg": "#331112",
        "--header-bgColor": "#1a0506",
        "--header-fgColor": "#f0e7d8",
        "--header-search-bg": "#2a0c0d",
        "--header-search-border": "#572022"
      })
    },
    {
      id: "cosmos",
      name: "Cosmos",
      base: "dark",
      vars: expand({
        "--bgColor-default": "#070a14",
        "--bgColor-muted": "rgba(22, 26, 48, 0.55)",
        "--bgColor-inset": "rgba(8, 10, 24, 0.66)",
        "--bgColor-emphasis": "rgba(58, 62, 110, 0.5)",
        "--fgColor-default": "#e8e9ff",
        "--fgColor-muted": "#a2a8d8",
        "--fgColor-subtle": "#6d72a8",
        "--borderColor-default": "rgba(150, 158, 240, 0.18)",
        "--borderColor-muted": "rgba(150, 158, 240, 0.12)",
        "--borderColor-subtle": "rgba(150, 158, 240, 0.12)",
        "--accent-fgColor": "#c3b1ff",
        "--accent-emphasis": "#a78bfa",
        "--accent-muted": "#a78bfa55",
        "--accent-subtle": "#a78bfa22",
        "--btn-primary-bg": "#7c6cf0",
        "--btn-primary-fg": "#ffffff",
        "--btn-primary-hover-bg": "#8f7ff7",
        "--btn-primary-border": "#7c6cf0",
        "--btn-bg": "rgba(26, 30, 56, 0.6)",
        "--btn-fg": "#e8e9ff",
        "--btn-border": "rgba(150, 158, 240, 0.2)",
        "--btn-hover-bg": "rgba(34, 39, 70, 0.7)",
        "--btn-active-bg": "rgba(34, 39, 70, 0.7)",
        "--btn-selected-bg": "rgba(34, 39, 70, 0.7)",
        "--header-bgColor": "rgba(7, 10, 20, 0.55)",
        "--header-fgColor": "#e8e9ff",
        "--header-search-bg": "rgba(22, 26, 48, 0.6)",
        "--header-search-border": "rgba(150, 158, 240, 0.2)"
      })
    }
  ];

  var DEFAULTS = {
    theme: "midnight",
    accent: "",
    simplify: "off",
    tips: false,
    fx: true,
    hideHScroll: false,
    bg: {
      type: "none",
      color: "#0d1117",
      c1: "#5b7cfa",
      c2: "#bd93f9",
      angle: 135,
      fade: 20
    },
    custom: {
      base: "dark",
      colors: {
        bg: CUSTOM_BASES.dark.bg,
        surface: CUSTOM_BASES.dark.surface,
        fg: CUSTOM_BASES.dark.fg,
        fgMuted: CUSTOM_BASES.dark.fgMuted,
        border: CUSTOM_BASES.dark.border,
        accent: CUSTOM_BASES.dark.accent,
        btn: CUSTOM_BASES.dark.btn,
        headerBg: CUSTOM_BASES.dark.headerBg
      }
    }
  };

  /* ------------------------------------------------------------------ *
   * Ambient effects per theme (petals / stars / embers)
   * ------------------------------------------------------------------ */
  var THEME_FX = {
    sakura: "petals",
    cosmos: "stars",
    nocturne: "embers",
    kinbeni: "embers"
  };

  /* ------------------------------------------------------------------ *
   * Settings normalization — deep-merges stored values over DEFAULTS so
   * partial/legacy data can never leave bg/custom missing their fields.
   * ------------------------------------------------------------------ */
  function deepMerge(base, extra) {
    var out = Object.assign({}, base);
    if (!extra) return out;
    Object.keys(extra).forEach(function (k) {
      var b = base[k], e = extra[k];
      if (e && typeof e === "object" && !Array.isArray(e) &&
          b && typeof b === "object" && !Array.isArray(b)) {
        out[k] = deepMerge(b, e);
      } else {
        out[k] = e;
      }
    });
    return out;
  }

  function normalizeSettings(stored) {
    var out = deepMerge(DEFAULTS, stored || {});
    if (!out.custom || typeof out.custom !== "object") out.custom = DEFAULTS.custom;
    if (!out.custom.colors || typeof out.custom.colors !== "object") {
      out.custom.colors = DEFAULTS.custom.colors;
    }
    if (!out.bg || typeof out.bg !== "object") out.bg = DEFAULTS.bg;
    return out;
  }

  root.GHX = {
    THEMES: THEMES,
    DEFAULTS: DEFAULTS,
    GRADIENTS: GRADIENTS,
    THEME_FX: THEME_FX,
    CUSTOM_FIELDS: CUSTOM_FIELDS,
    CUSTOM_BASES: CUSTOM_BASES,
    buildCustomVars: buildCustomVars,
    normalizeSettings: normalizeSettings,
    deepMerge: deepMerge,
    expand: expand,
    hexToRgb: hexToRgb,
    luminance: luminance,
    readableText: readableText,
    shade: shade
  };
})(typeof self !== "undefined" ? self : this);
