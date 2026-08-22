#!/usr/bin/env python3
"""
OCTANE asset generator.

Regenerates:
  - icons/icon{16,48,128}.png   (the extension icon)
  - docs/themes-preview.png     (theme preview grid for the README)

Requires: pip install pillow
Usage:    python3 tools/make_assets.py
"""
import json
import os
import re
import subprocess
import sys

from PIL import Image, ImageDraw, ImageFont

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


# ----------------------------------------------------------------------
# Helpers
# ----------------------------------------------------------------------
def hex_rgb(h):
    h = h.lstrip("#")
    return tuple(int(h[i:i + 2], 16) for i in (0, 2, 4))


def solid(v):
    """Convert a hex or rgba(...) color to a solid hex string."""
    v = (v or "").strip()
    if v.startswith("#"):
        return v
    m = re.match(r"rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)", v)
    if m:
        return "#%02x%02x%02x" % tuple(int(x) for x in m.groups())
    return v or "#888888"


def lerp(c1, c2, t):
    return tuple(round(a + (b - a) * t) for a, b in zip(c1, c2))


def font(size):
    try:
        return ImageFont.load_default(size)
    except TypeError:
        return ImageFont.load_default()


def rgba(c, a=255):
    return (c[0], c[1], c[2], a)


# ----------------------------------------------------------------------
# Load theme definitions from the shared JS file (no node needed — we
# regex out the literal color strings keyed by variable name).
# ----------------------------------------------------------------------
def load_themes():
    path = os.path.join(ROOT, "shared", "themes.js")
    src = open(path, encoding="utf-8").read()

    themes = []
    for block in re.finditer(r'\{\s*id:\s*"([^"]+)",\s*name:\s*"([^"]+)",\s*base:\s*"([^"]+)",\s*vars:\s*expand\(\{(.*?)\}\)\s*\}',
                             src, re.S):
        tid, name, base, body = block.groups()
        vars_ = {}
        for k, v in re.findall(r'"?(--[a-zA-Z0-9-]+)"?\s*:\s*"([^"]+)"', body):
            vars_[k] = v
        themes.append({"id": tid, "name": name, "base": base, "vars": vars_})
    return themes


def pick(theme, key, fallback="#888888"):
    v = theme["vars"].get(key)
    return v or theme["vars"].get("--accent-emphasis") or fallback


# ----------------------------------------------------------------------
# Logo / icon — "squad chevron" mark
#
# Three ascending chevrons (a nod to "octane" = squad / rank), white on a
# black rounded tile. Clean, minimal, and readable down to 16px.
# ----------------------------------------------------------------------
# Chevron geometry on a 1024-design canvas. Each entry is a polyline:
# (bottom-left) -> (apex) -> (bottom-right).
CHEVRONS = [
    [(182, 657), (512, 497), (842, 657)],
    [(277, 557), (512, 427), (747, 557)],
    [(362, 467), (512, 367), (662, 467)],
]
WHITE = (240, 240, 242, 255)
BLACK = (10, 10, 12, 255)


def draw_chevron_mark(d, cx, cy, scale, color, min_thickness=3):
    """Draw the three chevrons centered at (cx, cy), scaled by `scale`
    (relative to the 1024 design canvas)."""
    thick = max(min_thickness, int(round(80 * scale)))
    for pts in CHEVRONS:
        d.line(
            [(cx + int((x - 512) * scale), cy + int((y - 512) * scale)) for x, y in pts],
            fill=color,
            width=thick,
            joint="curve",
        )


def make_icon():
    """Black rounded-square tile + white chevron mark (16/48/128)."""
    os.makedirs(os.path.join(ROOT, "icons"), exist_ok=True)
    S = 1024
    img = Image.new("RGBA", (S, S), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    d.rounded_rectangle([0, 0, S - 1, S - 1], radius=int(S * 0.22), fill=BLACK)
    draw_chevron_mark(d, S // 2, S // 2, 1.0, WHITE)
    for size in (16, 48, 128):
        img.resize((size, size), Image.LANCZOS).save(
            os.path.join(ROOT, "icons", f"icon{size}.png"))
    print("icons written")


def make_logo():
    """Transparent mark for the popup header (white chevrons only)."""
    S = 128
    img = Image.new("RGBA", (S, S), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    # Fit the 660-wide mark into 96px with a little breathing room.
    scale = 96 / 660.0
    draw_chevron_mark(d, S // 2, S // 2, scale, WHITE)
    img.save(os.path.join(ROOT, "icons", "logo.png"))
    print("logo written")


# ----------------------------------------------------------------------
# Theme preview grid
# ----------------------------------------------------------------------
def draw_card(t):
    W, H = 300, 200
    img = Image.new("RGBA", (W, H), rgba(hex_rgb(solid(pick(t, "--bgColor-default", "#ffffff")))))
    d = ImageDraw.Draw(img)

    header_bg = hex_rgb(solid(pick(t, "--header-bgColor", pick(t, "--bgColor-default"))))
    header_fg = hex_rgb(solid(pick(t, "--header-fgColor", pick(t, "--fgColor-default"))))
    border = hex_rgb(solid(pick(t, "--borderColor-default", "#cccccc")))
    fg = hex_rgb(solid(pick(t, "--fgColor-default", "#222222")))
    muted = hex_rgb(solid(pick(t, "--fgColor-muted", "#888888")))
    accent_key = pick(t, "--accent-emphasis", pick(t, "--btn-primary-bg", "#5555ff"))
    accent = hex_rgb(solid(accent_key))
    btn_bg = hex_rgb(solid(pick(t, "--btn-primary-bg", accent_key)))
    muted_bg = hex_rgb(solid(pick(t, "--bgColor-muted", "#eeeeee")))

    # Header strip
    d.rectangle([0, 0, W, 34], fill=rgba(header_bg))
    d.line([(0, 34), (W, 34)], fill=rgba(border))
    d.ellipse([10, 8, 26, 24], fill=rgba(accent))          # fake logo
    d.rounded_rectangle([W - 96, 9, W - 12, 25], radius=8, outline=rgba(border),
                        fill=rgba(muted_bg))               # fake search

    f_name = font(15)
    f_tag = font(11)
    f_line = font(10)
    d.text((36, 8), t["name"], font=f_name, fill=rgba(header_fg))

    # Mode tag (right of name)
    tag = t["base"].upper()
    tw = d.textlength(tag, font=f_tag)
    d.rounded_rectangle([36, 8 + 16, 36 + tw + 12, 8 + 16 + 12], radius=4,
                        outline=rgba(border))
    d.text((36 + 6, 8 + 16 - 1), tag, font=f_tag, fill=rgba(muted))

    # Tab bar
    ty = 42
    d.rounded_rectangle([10, ty, 58, ty + 14], radius=4, fill=rgba(accent))
    d.rounded_rectangle([10, ty + 6, 34, ty + 10], radius=2, fill=rgba(header_bg))
    for i, twd in enumerate((34, 28, 22)):
        x = 66 + i * (twd + 8)
        d.rounded_rectangle([x, ty, x + twd, ty + 14], radius=4, outline=rgba(border))

    # Sidebar
    sx = W - 86
    d.rounded_rectangle([sx, 64, W - 10, 188], radius=6, fill=rgba(muted_bg), outline=rgba(border))
    for i, w in enumerate((44, 50, 36)):
        d.rounded_rectangle([sx + 10, 76 + i * 16, sx + 10 + w, 76 + i * 16 + 6],
                            radius=3, fill=rgba(border))

    # Content lines
    d.rounded_rectangle([10, 68, 120, 74], radius=3, fill=rgba(fg))       # title
    for i, w in enumerate((120, 132, 96, 128)):
        d.rounded_rectangle([10, 84 + i * 14, 10 + w, 84 + i * 14 + 6],
                            radius=3, fill=rgba(muted))

    # Primary button
    d.rounded_rectangle([10, 150, 74, 168], radius=6, fill=rgba(btn_bg))
    d.rounded_rectangle([16, 156, 34, 162], radius=3, fill=rgba(header_bg))

    return img


def make_preview():
    themes = load_themes()
    cols, gap, pad = 4, 16, 24
    cw, ch = 300, 200
    total_w = pad * 2 + cols * cw + (cols - 1) * gap
    rows = (len(themes) + cols - 1) // cols
    total_h = pad * 2 + rows * ch + (rows - 1) * gap

    canvas = Image.new("RGBA", (total_w, total_h), (13, 17, 26, 255))
    d = ImageDraw.Draw(canvas)
    f_title = font(22)
    f_sub = font(13)

    title = "OCTANE themes"
    d.text((pad, 16), title, font=f_title, fill=(236, 239, 244, 255))
    d.text((pad, 44), "10 curated themes · click any theme in the popup to preview it live",
           font=f_sub, fill=(139, 147, 167, 255))

    y0 = 64
    for i, t in enumerate(themes):
        x = pad + (i % cols) * (cw + gap)
        y = y0 + (i // cols) * (ch + gap)
        card = draw_card(t)
        canvas.alpha_composite(card, (x, y))

    # footer credit
    d.text((pad, total_h - 22), "generated by tools/make_assets.py", font=f_sub,
           fill=(90, 100, 120, 255))

    out = os.path.join(ROOT, "docs", "themes-preview.png")
    os.makedirs(os.path.dirname(out), exist_ok=True)
    canvas.convert("RGB").save(out)
    print("preview written:", out)


if __name__ == "__main__":
    make_icon()
    make_logo()
    make_preview()
    print("done")
