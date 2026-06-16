#!/usr/bin/env python3
"""Generate PDF report from ops/agents/cfo-finanzen/transactions.csv (stdlib only)."""

import csv
from datetime import date
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
CSV_PATH = ROOT / "ops/agents/cfo-finanzen/transactions.csv"
PDF_PATH = ROOT / "ops/agents/cfo-finanzen/transactions.pdf"


def pdf_literal(text: str) -> str:
    out = []
    for ch in text:
        if ch == "\\":
            out.append("\\\\")
        elif ch == "(":
            out.append("\\(")
        elif ch == ")":
            out.append("\\)")
        elif ord(ch) <= 255:
            out.append(ch)
        else:
            out.append("?")
    return "(" + "".join(out) + ")"


def wrap(text: str, width: int) -> list[str]:
    text = " ".join(text.split())
    if len(text) <= width:
        return [text]
    words, lines, cur = text.split(" "), [], ""
    for w in words:
        test = (cur + " " + w).strip()
        if len(test) <= width:
            cur = test
        else:
            if cur:
                lines.append(cur)
            cur = w
    if cur:
        lines.append(cur)
    return lines or [""]


def layout_pages(rows: list[dict]) -> list[list[tuple[float, float, str, int]]]:
    ausgaben = sum(float(r["betrag_eur"] or 0) for r in rows if r["typ"] == "ausgabe")
    einnahmen = sum(float(r["betrag_eur"] or 0) for r in rows if r["typ"] == "einnahme")
    gratis = sum(1 for r in rows if r["typ"].startswith("service-"))

    pages: list[list[tuple[float, float, str, int]]] = [[]]
    y = 800.0
    bottom = 48.0

    def new_page():
        nonlocal y
        pages.append([])
        y = 800.0

    def add(text: str, size: int = 10, dy: float = 12):
        nonlocal y
        for part in wrap(text, 92):
            y -= dy
            if y < bottom:
                new_page()
            pages[-1].append((50, y, part, size))

    add("KiezQuiz — Finanz-Transaktionen", size=16, dy=20)
    add(f"Stand: {date.today().isoformat()} · Quelle: transactions.csv", size=9, dy=14)
    add(
        f"Ausgaben: {ausgaben:,.2f} EUR · Einnahmen: {einnahmen:,.2f} EUR · "
        f"Saldo: {einnahmen - ausgaben:,.2f} EUR · Service-Einträge: {gratis}",
        size=9,
        dy=16,
    )
    y -= 6

    for r in rows:
        y -= 4
        add(
            f"{r['datum']} | {r['typ']} | {r['anbieter']} | "
            f"{r['betrag']} {r['waehrung']} (= {r['betrag_eur']} EUR)",
            size=10,
            dy=12,
        )
        add(r["beschreibung"], size=9, dy=11)
        if r.get("notiz"):
            add(f"Notiz: {r['notiz']}", size=9, dy=10)

    return [p for p in pages if p]


def stream_body(layout: list[tuple[float, float, str, int]]) -> str:
    stream = ["BT"]
    for x, yy, text, size in layout:
        stream.append(f"/F1 {size} Tf {x} {yy} Td {pdf_literal(text)} Tj")
    stream.append("ET")
    return "\n".join(stream)


def build_pdf(page_layouts: list[list[tuple[float, float, str, int]]]) -> bytes:
    n = len(page_layouts)
    font_id = 3 + 2 * n
    content_ids = [4 + 2 * i for i in range(n)]
    page_ids = [3 + 2 * i for i in range(n)]

    objects: dict[int, str] = {}
    objects[1] = "<< /Type /Catalog /Pages 2 0 R >>"
    objects[2] = f"<< /Type /Pages /Kids [{' '.join(f'{i} 0 R' for i in page_ids)}] /Count {n} >>"
    objects[font_id] = "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>"

    for i, layout in enumerate(page_layouts):
        body = stream_body(layout)
        objects[content_ids[i]] = f"<< /Length {len(body)} >>\nstream\n{body}\nendstream"
        objects[page_ids[i]] = (
            f"<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] "
            f"/Resources << /Font << /F1 {font_id} 0 R >> >> /Contents {content_ids[i]} 0 R >>"
        )

    max_id = max(objects)
    parts = [b"%PDF-1.4\n"]
    offsets = [0]
    for obj_id in range(1, max_id + 1):
        offsets.append(sum(len(p) for p in parts))
        parts.append(f"{obj_id} 0 obj\n".encode("ascii"))
        parts.append(objects[obj_id].encode("latin-1", errors="replace"))
        parts.append(b"\nendobj\n")

    xref_pos = sum(len(p) for p in parts)
    parts.append(f"xref\n0 {max_id + 1}\n".encode("ascii"))
    parts.append(b"0000000000 65535 f \n")
    for off in offsets[1:]:
        parts.append(f"{off:010d} 00000 n \n".encode("ascii"))
    parts.append(
        f"trailer\n<< /Size {max_id + 1} /Root 1 0 R >>\n"
        f"startxref\n{xref_pos}\n%%EOF\n".encode("ascii")
    )
    return b"".join(parts)


def main() -> None:
    with CSV_PATH.open(encoding="utf-8", newline="") as f:
        rows = list(csv.DictReader(f, delimiter=";"))

    layouts = layout_pages(rows)
    PDF_PATH.write_bytes(build_pdf(layouts))
    print(f"Wrote {PDF_PATH} ({len(rows)} Einträge, {len(layouts)} Seite(n))")


if __name__ == "__main__":
    main()
