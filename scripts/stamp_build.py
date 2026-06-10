#!/usr/bin/env python3
"""Write version.json and stamp ?v= on local src/ assets in HTML for cache busting."""
from __future__ import annotations

import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
# Bump when a release must force fresh CSS/JS for all returning visitors (e.g. redesign).
DESIGN_REVISION = 9
SRC_ATTR_RE = re.compile(
    r'(?P<prefix>(?:href|src)="(?:\.\./)?src/[^"?]+)(?:\?[^"]*)?(?P<suffix>")'
)


def inject_build_meta(html: str, build: str) -> str:
    meta = (
        f'<meta name="kiezquiz-build" content="{build}">\n'
        f'  <meta name="kiezquiz-design" content="{DESIGN_REVISION}">'
    )
    if 'name="kiezquiz-build"' in html:
        html = re.sub(
            r'<meta name="kiezquiz-build" content="[^"]*">',
            f'<meta name="kiezquiz-build" content="{build}">',
            html,
            count=1,
        )
        html = re.sub(
            r'<meta name="kiezquiz-design" content="[^"]*">',
            f'<meta name="kiezquiz-design" content="{DESIGN_REVISION}">',
            html,
            count=1,
        )
        return html
    return html.replace('<meta charset="UTF-8">', f'<meta charset="UTF-8">\n  {meta}', 1)


def stamp_html(html: str, build: str) -> str:
    html = inject_build_meta(html, build)
    token = f'?v={build}'

    def repl(match: re.Match[str]) -> str:
        path = match.group('prefix')
        if token in path:
            return match.group(0)
        return f'{path}{token}{match.group("suffix")}'

    return SRC_ATTR_RE.sub(repl, html)


def main() -> int:
    if len(sys.argv) < 2:
        print('Usage: stamp_build.py <build-id> [site-dir]', file=sys.stderr)
        return 1

    build = sys.argv[1].strip()
    if not build:
        print('build-id must not be empty', file=sys.stderr)
        return 1

    site_dir = Path(sys.argv[2]).resolve() if len(sys.argv) > 2 else ROOT
    if site_dir != ROOT:
        site_dir.mkdir(parents=True, exist_ok=True)
    version_payload = json.dumps(
        {'build': build, 'design': DESIGN_REVISION},
        separators=(',', ':'),
    )

    version_targets = [site_dir / 'version.json']
    if site_dir == ROOT:
        version_targets.append(ROOT / 'version.json')
    for version_path in version_targets:
        version_path.write_text(version_payload + '\n', encoding='utf-8')

    html_files = [
        p for p in site_dir.rglob('*.html')
        if 'scripts' not in p.parts or p.parent.name != 'scripts'
    ]
    for path in html_files:
        text = path.read_text(encoding='utf-8')
        stamped = stamp_html(text, build)
        if stamped != text:
            path.write_text(stamped, encoding='utf-8')

    print(f'Stamped build {build} under {site_dir}')
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
