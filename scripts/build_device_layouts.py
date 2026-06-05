#!/usr/bin/env python3
"""
Build KiezQuiz device layout CSS (phone / tablet / desktop / touch).

Sources: mobile.css (legacy), base.css, redesign.css, hub.css — responsive @media blocks
are merged into src/styles/device/*.css and removed from sources.

Re-run after editing legacy mobile.css only if you still keep a full copy elsewhere.
Normal workflow: edit device/phone.css, tablet.css, desktop.css directly.

Run: python3 scripts/build_device_layouts.py
"""
from __future__ import annotations

import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
STYLES = ROOT / "src" / "styles"
DEVICE = STYLES / "device"
LEGACY_MOBILE = STYLES / "mobile.css"

PHONE_MAX = 767
TABLET_MIN = 768
TABLET_MAX = 1024
DESKTOP_MIN = 1025

FILE_HEADER = """/* ============================================================
   KiezQuiz — {title}
   Breakpoint: {bp}
   Bearbeite NUR diese Datei für {device}-Layout.
   Siehe src/styles/device/README.md
   ============================================================ */

"""

MIGRATION_MARKER = "/* Device layouts: src/styles/device/ (phone, tablet, desktop, touch) */\n"


def extract_media_blocks(css: str) -> list[tuple[str, str]]:
    blocks: list[tuple[str, str]] = []
    i = 0
    pat = re.compile(r"@media\s*(\([^)]+\))\s*\{", re.MULTILINE)
    while i < len(css):
        m = pat.search(css, i)
        if not m:
            break
        start = m.start()
        brace = m.end() - 1
        depth = 0
        j = brace
        while j < len(css):
            ch = css[j]
            if ch == "{":
                depth += 1
            elif ch == "}":
                depth -= 1
                if depth == 0:
                    full = css[start : j + 1]
                    blocks.append((m.group(1).strip(), full))
                    i = j + 1
                    break
            j += 1
        else:
            break
    return blocks


def inner_rules(media_block: str) -> str:
    first = media_block.find("{")
    last = media_block.rfind("}")
    return media_block[first + 1 : last].strip("\n")


def wrap_device(query_open: str, inner: str, source: str = "") -> str:
    if not inner.strip():
        return ""
    note = f"  /* from {source} */\n" if source else ""
    body = note + "\n".join(f"  {line}" if line.strip() else "" for line in inner.splitlines())
    return f"@media {query_open} {{\n{body}\n}}\n"


def remove_media_blocks(css: str, *, keep: tuple[str, ...] = ("prefers-reduced-motion",)) -> str:
    out = css
    for _query, block in extract_media_blocks(css):
        if any(k in block for k in keep):
            continue
        out = out.replace(block, "", 1)
    return re.sub(r"\n{3,}", "\n\n", out)


def classify(query: str) -> str:
    if "hover: none" in query and "pointer: coarse" in query:
        return "touch"
    if re.search(r"min-width:\s*1025", query):
        return "desktop"
    if re.search(r"min-width:\s*1024", query) and "max-width" not in query:
        return "desktop"
    if re.search(r"max-width:\s*1024", query):
        return "tablet_phone"
    if re.search(r"max-width:\s*960", query):
        return "tablet_phone"
    if re.search(r"max-width:\s*900", query):
        return "tablet_phone"
    if re.search(r"max-width:\s*768", query):
        return "phone"
    if re.search(r"max-width:\s*720", query):
        return "phone_nested"
    if re.search(r"max-width:\s*640", query):
        return "phone_nested"
    if re.search(r"max-width:\s*520", query):
        return "phone_nested"
    if re.search(r"max-width:\s*400", query):
        return "phone_nested"
    if re.search(r"max-width:\s*380", query):
        return "phone_nested"
    return "skip"


def route_block(query: str, block: str, source: str) -> dict[str, list[str]]:
    kind = classify(query)
    inner = inner_rules(block)
    buckets: dict[str, list[str]] = {
        "phone": [],
        "tablet": [],
        "desktop": [],
        "touch": [],
        "phone_nested": [],
    }
    if kind == "skip" or not inner:
        return buckets
    if kind == "touch":
        buckets["touch"].append(block + "\n")
        return buckets
    if kind == "desktop":
        buckets["desktop"].append(wrap_device(f"(min-width: {DESKTOP_MIN}px)", inner, source))
        return buckets
    if kind == "tablet_phone":
        buckets["tablet"].append(
            wrap_device(
                f"(min-width: {TABLET_MIN}px) and (max-width: {TABLET_MAX}px)",
                inner,
                source,
            )
        )
        buckets["phone"].append(wrap_device(f"(max-width: {PHONE_MAX}px)", inner, source))
        return buckets
    if kind == "phone":
        buckets["phone"].append(wrap_device(f"(max-width: {PHONE_MAX}px)", inner, source))
        return buckets
    if kind == "phone_nested":
        buckets["phone_nested"].append(block + "\n")
    return buckets


def merge_buckets(target: dict[str, list[str]], src: dict[str, list[str]]) -> None:
    for k, v in src.items():
        target[k].extend(v)


def collect_from_file(path: Path) -> dict[str, list[str]]:
    buckets: dict[str, list[str]] = {
        "phone": [],
        "tablet": [],
        "desktop": [],
        "touch": [],
        "phone_nested": [],
    }
    css = path.read_text(encoding="utf-8")
    for query, block in extract_media_blocks(css):
        merge_buckets(buckets, route_block(query, block, path.name))
    return buckets


def write_device_files(buckets: dict[str, list[str]]) -> None:
    DEVICE.mkdir(parents=True, exist_ok=True)

    phone_css = FILE_HEADER.format(
        title="Phone layout", bp=f"max-width {PHONE_MAX}px", device="Handy"
    )
    phone_css += "\n".join(buckets["phone"])
    if buckets["phone_nested"]:
        phone_css += "\n/* --- Phone-only refinements (smaller breakpoints) --- */\n\n"
        phone_css += "\n".join(buckets["phone_nested"])

    tablet_css = FILE_HEADER.format(
        title="Tablet layout", bp=f"{TABLET_MIN}px – {TABLET_MAX}px", device="Tablet"
    )
    tablet_css += "\n".join(buckets["tablet"])

    desktop_css = FILE_HEADER.format(
        title="Desktop layout", bp=f"min-width {DESKTOP_MIN}px", device="Computer"
    )
    desktop_inner = "\n".join(buckets["desktop"]).strip()
    if not desktop_inner:
        desktop_css += wrap_device(
            f"(min-width: {DESKTOP_MIN}px)",
            "/* Desktop-only overrides — add rules here */",
            "",
        )
    else:
        desktop_css += desktop_inner + "\n"

    touch_css = FILE_HEADER.format(
        title="Touch input",
        bp="(hover: none) and (pointer: coarse)",
        device="Touch-Geräte (zusätzlich zur Breite)",
    )
    touch_css += "\n".join(buckets["touch"]) or "/* Touch-only overrides */\n"

    (DEVICE / "phone.css").write_text(phone_css, encoding="utf-8")
    (DEVICE / "tablet.css").write_text(tablet_css, encoding="utf-8")
    (DEVICE / "desktop.css").write_text(desktop_css, encoding="utf-8")
    (DEVICE / "touch.css").write_text(touch_css, encoding="utf-8")


def strip_sources() -> None:
    for name in ("base.css", "redesign.css", "hub.css"):
        path = STYLES / name
        css = path.read_text(encoding="utf-8")
        stripped = remove_media_blocks(css)
        if MIGRATION_MARKER.strip() not in stripped:
            # Insert marker once after first major comment block or at responsive section
            if "/* Responsive Styles */" in stripped:
                stripped = stripped.replace(
                    "/* Responsive Styles */",
                    MIGRATION_MARKER + "/* Responsive Styles (moved to device/) */",
                    1,
                )
            elif name == "redesign.css" and "/* Responsive (hub/header" in stripped:
                stripped = stripped.replace(
                    "/* Responsive (hub/header; city play → mobile.css) */",
                    MIGRATION_MARKER + "/* Responsive (moved to device/) */",
                    1,
                )
            elif name == "hub.css":
                stripped = stripped.rstrip() + "\n\n" + MIGRATION_MARKER
        path.write_text(stripped, encoding="utf-8")
        print(f"Stripped @media from {name}")


def write_mobile_shim() -> None:
    LEGACY_MOBILE.write_text(
        "/* Deprecated entry point — HTML links device/*.css directly.\n"
        "   Re-generate all device files: python3 scripts/build_device_layouts.py\n"
        "   (requires a backup of the old monolithic mobile.css as migration source.)\n"
        "*/\n"
        '@import url("device/desktop.css");\n'
        '@import url("device/tablet.css");\n'
        '@import url("device/phone.css");\n'
        '@import url("device/touch.css");\n',
        encoding="utf-8",
    )


def main() -> None:
    if not LEGACY_MOBILE.exists():
        raise SystemExit(f"Missing {LEGACY_MOBILE}")

    # If mobile.css is already the shim, read from device backup isn't available — use existing device + other sources
    raw = LEGACY_MOBILE.read_text(encoding="utf-8")
    buckets: dict[str, list[str]] = {
        "phone": [],
        "tablet": [],
        "desktop": [],
        "touch": [],
        "phone_nested": [],
    }

    backup = STYLES / "mobile.css.source"
    if "@import url(" not in raw[:400]:
        if not backup.exists():
            backup.write_text(raw, encoding="utf-8")
            print(f"Backed up {backup}")
        first_media = raw.find("@media")
        for query, block in extract_media_blocks(raw[first_media:]):
            merge_buckets(buckets, route_block(query, block, "mobile.css"))
    elif backup.exists():
        src = backup.read_text(encoding="utf-8")
        first_media = src.find("@media")
        for query, block in extract_media_blocks(src[first_media:]):
            merge_buckets(buckets, route_block(query, block, "mobile.css.source"))

    for extra in ("base.css", "redesign.css", "hub.css"):
        p = STYLES / extra
        if p.exists():
            b = collect_from_file(p)
            for k in buckets:
                buckets[k].extend(b[k])

    write_device_files(buckets)
    strip_sources()
    write_mobile_shim()
    print(f"Wrote {DEVICE}/phone.css, tablet.css, desktop.css, touch.css")


if __name__ == "__main__":
    main()
