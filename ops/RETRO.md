# Retro — Leitagent Kalle

Kurze Learnings nach größeren Durchläufen (Datum · Kontext · Lehre).

---

## 2026-06-15 — Zugangs-Setup & Phase 1

**Kontext:** Master-Auftrag v2, ops-Struktur, Zugangs-Matrix.

**Gut:** Supabase/Cloudflare/Notion MCPs; klare Human-Gates; GSC + Resend schnell erledigt.

**Schlecht:** Backup wurde mit „Supabase Pro" verwechselt — Free Tier erlaubt manuellen pg_dump (`docs/BACKUP-SUPABASE.md`), nur Supabase-eigene Auto-Backups sind Pro.

## 2026-06-15 — Phase 1 abgeschlossen

**Lehre:** `PATH=` in GitHub Actions kann `python3` löschen — besser `export PATH=...:$PATH` im Run-Block.

**Lehre:** Backup-Archiv gehört Kalle (Skript + Supplement-Ordner), nicht menschliche Copy-Paste-Routine.

## 2026-06-15 — Masterauftrag v2 abgeschlossen

**Kontext:** Phase 2 Finance + Support, Phase 3 Legal-Koordination.

**Lehre:** Free-Tier-Services explizit inventarisieren — sonst überrascht Resend/Supabase bei Wachstum.

**Lehre:** Legal = Koordination in Cursor, Formulierung in Legora — getrennte Rollen klar halten.

---
