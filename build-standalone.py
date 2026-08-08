#!/usr/bin/env python3
"""Bundle the game into ONE self-contained HTML file.

The published page can make no external requests at all, so this inlines the
stylesheet, flattens the ES modules into a single classic script, and embeds
every card as a data: URI. Run it again after changing any source file.

    python3 build-standalone.py
"""

import base64
import pathlib
import re

ROOT = pathlib.Path(__file__).parent
OUT = ROOT / "dist" / "alexias-world-memory.html"

# Dependency order — cards has no imports, main depends on everything.
MODULES = ["cards", "state", "audio", "ui", "parentgate", "game", "main"]

CARDS = sorted((ROOT / "assets/cards/web").glob("*.jpg"))
ICON = ROOT / "assets/brand/heart-icon-256.jpg"


def data_uri(path: pathlib.Path) -> str:
    return "data:image/jpeg;base64," + base64.b64encode(path.read_bytes()).decode()


def strip_module_syntax(src: str) -> str:
    """Turn an ES module into plain script source."""
    src = re.sub(r"^import[^;]*?;\s*$", "", src, flags=re.MULTILINE | re.DOTALL)
    src = re.sub(r"^export\s+(const|function|let|class)\b", r"\1", src, flags=re.MULTILINE)
    return src


def js_ascii(src: str) -> str:
    """Escape every non-ASCII character as \\uXXXX.

    The published page is wrapped in a skeleton we do not control, so we cannot
    guarantee a charset declaration reaches the parser before our emoji do.
    Rather than gamble on it, emit pure ASCII — the escapes are equivalent
    inside JS string literals, and harmless inside comments.
    """
    out = []
    for ch in src:
        if ord(ch) < 128:
            out.append(ch)
            continue
        # \uXXXX takes UTF-16 code units, so astral characters (most emoji)
        # become a surrogate pair.
        raw = ch.encode("utf-16-be")
        for i in range(0, len(raw), 2):
            out.append("\\u%04x" % int.from_bytes(raw[i:i + 2], "big"))
    return "".join(out)


def html_ascii(src: str) -> str:
    """Escape non-ASCII in markup/CSS as HTML numeric entities."""
    return "".join(c if ord(c) < 128 else f"&#{ord(c)};" for c in src)


def main() -> None:
    art = {p.stem: data_uri(p) for p in CARDS}
    art_map = ",\n  ".join(f'"{k}": "{v}"' for k, v in art.items())

    parts = []
    for name in MODULES:
        src = (ROOT / "src" / f"{name}.js").read_text()

        if name == "cards":
            # Card art and the logo come from embedded data URIs, not the filesystem.
            src = src.replace(
                "function artUrl(name) { return `assets/cards/web/${name}.jpg`; }",
                "function artUrl(name) { return ART[name]; }",
            )
            src = src.replace(
                "const LOGO_URL = 'assets/brand/heart-icon-256.jpg';",
                "const LOGO_URL = ICON;",
            )
        if name == "main":
            src = src.replace("src: 'assets/brand/heart-icon-256.jpg'", "src: ICON")

        parts.append(f"/* ---- {name}.js ---- */\n{strip_module_syntax(src)}")

    css = (ROOT / "styles.css").read_text()
    # The published page supplies its own <body>; pin the app to the viewport
    # rather than inheriting a height that may not be set.
    css += """
/* --- standalone build only --- */
html, body { height: 100dvh; margin: 0; padding: 0; }
#app { height: 100dvh; }
"""

    html = f"""<title>Alexia's World - Memory Match</title>
<style>
{html_ascii(css)}
</style>

<div id="app" aria-live="polite"></div>

<script>
const ICON = "{data_uri(ICON)}";
const ART = {{
  {art_map}
}};

{js_ascii(chr(10).join(parts))}
</script>
"""

    assert html.isascii(), "output must be pure ASCII"

    OUT.parent.mkdir(exist_ok=True)
    OUT.write_text(html)
    kb = OUT.stat().st_size / 1024
    print(f"wrote {OUT.relative_to(ROOT)}  —  {kb:.0f} KB, {len(art)} cards embedded")


if __name__ == "__main__":
    main()
