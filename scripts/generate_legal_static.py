#!/usr/bin/env python3
"""
Embed German legal page HTML into #legal-content for no-JavaScript fallback (§ 5 DDG, Art. 13 DSGVO).
Run before deploy; legalPage.js replaces this content when JS is enabled.
"""
from __future__ import annotations

import html
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
LOCALE = ROOT / "src" / "locales" / "de.json"
LEGAL_CONFIG = ROOT / "src" / "data" / "legalConfig.js"
OSS_LICENSES = ROOT / "src" / "data" / "openSourceLicenses.js"

PAGE_MAP = {
    "impressum/index.html": "impressum",
    "datenschutz/index.html": "privacy",
    "nutzungsbedingungen/index.html": "terms",
    "lizenzen/index.html": "licenses",
    "barrierefreiheit/index.html": "accessibility",
}


def load_operator() -> dict:
    text = LEGAL_CONFIG.read_text(encoding="utf-8")
    op: dict[str, str] = {}
    for key in ("name", "street", "postalCode", "city", "country", "email", "phone"):
        m = re.search(rf"{key}:\s*'([^']*)'", text)
        if m:
            op[key] = m.group(1)
    return op


def esc(s: str) -> str:
    return html.escape(s, quote=True)


def render_operator(op: dict) -> str:
    email = op.get("email", "")
    phone = op.get("phone", "")
    email_link = (
        f'<a href="mailto:{esc(email)}">{esc(email)}</a>' if email else ""
    )
    phone_link = (
        f'<br><a href="tel:{esc(phone.replace(" ", ""))}">{esc(phone)}</a>'
        if phone
        else ""
    )
    addr = ""
    if op.get("street") and op.get("postalCode") and op.get("city"):
        addr = (
            f"{esc(op['street'])}<br>"
            f"{esc(op['postalCode'])} {esc(op['city'])}<br>"
            f"{esc(op.get('country', ''))}<br>"
        )
    return (
        f'<p class="legal-operator-block"><strong>{esc(op.get("name", ""))}</strong><br>'
        f"{addr}{email_link}{phone_link}</p>"
    )


def render_sections(sections: list, op: dict) -> str:
    parts: list[str] = []
    for section in sections or []:
        title = section.get("title") or ""
        title_html = f"<h2>{esc(title)}</h2>" if title else ""
        body = ""
        for para in section.get("paragraphs") or []:
            if para == "{{operator}}":
                body += render_operator(op)
            else:
                body += f"<p>{para}</p>"
        if section.get("list"):
            body += "<ul>" + "".join(f"<li>{item}</li>" for item in section["list"]) + "</ul>"
        for para in section.get("afterList") or []:
            body += f"<p>{para}</p>"
        parts.append(f'<section class="legal-section kq-card">{title_html}{body}</section>')
    return "".join(parts)


def render_licenses(legal: dict, op: dict) -> str:
    lic = legal.get("licenses", {})
    intro = lic.get("intro") or []
    intro_html = "".join(f"<p>{p}</p>" for p in intro)
    sections_html = render_sections(lic.get("sections") or [], op)
    return (
        f'<section class="legal-section kq-card">{intro_html}</section>'
        f"{sections_html}"
    )


def render_footer() -> str:
    return (
        '<nav class="legal-footer-nav" aria-label="Rechtliches">'
        '<a href="/datenschutz/">Datenschutz</a>'
        '<a href="/impressum/">Impressum</a>'
        '<a href="/nutzungsbedingungen/">Nutzungsbedingungen</a>'
        '<a href="/lizenzen/">Lizenzen</a>'
        '<a href="/barrierefreiheit/">Barrierefreiheit</a>'
        '<a href="/about/">Über das KiezQuiz</a>'
        "</nav>"
        '<a href="/" class="legal-back-link">← Zurück zum Quiz</a>'
    )


def build_content(page_key: str, legal: dict, op: dict, last_updated: str) -> str:
    if page_key == "licenses":
        body = render_licenses(legal, op)
    else:
        sections = (legal.get(page_key) or {}).get("sections") or []
        body = render_sections(sections, op)
    notice = (
        f'<p class="legal-static-notice">Stand: {esc(last_updated)} '
        "(Deutsch, ohne JavaScript — vollständige zweisprachige Ansicht mit aktiviertem JavaScript)</p>"
    )
    return (
        f'<div class="legal-static-fallback">{notice}{body}{render_footer()}</div>'
    )


def inject_html(path: Path, content: str) -> None:
    text = path.read_text(encoding="utf-8")
    pattern = re.compile(
        r'(<div id="legal-content">)(.*?)(</div>)',
        re.DOTALL,
    )
    new_text, n = pattern.subn(rf"\1\n{content}\n      \3", text, count=1)
    if n != 1:
        print(f"WARN: could not inject into {path}", file=sys.stderr)
        return
    path.write_text(new_text, encoding="utf-8")
    print(f"✓ {path.relative_to(ROOT)}")


def main() -> int:
    locale = json.loads(LOCALE.read_text(encoding="utf-8"))
    legal = locale.get("legalPages") or {}
    op = load_operator()
    cfg_text = LEGAL_CONFIG.read_text(encoding="utf-8")
    m = re.search(r"lastUpdated:\s*'([^']*)'", cfg_text)
    last_updated = m.group(1) if m else ""

    for rel, page_key in PAGE_MAP.items():
        path = ROOT / rel
        if not path.exists():
            print(f"SKIP missing {rel}", file=sys.stderr)
            continue
        content = build_content(page_key, legal, op, last_updated)
        inject_html(path, content)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
