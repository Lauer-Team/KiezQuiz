# Retro — Leitagent Kalle

Kurze Learnings nach größeren Durchläufen (Datum · Kontext · Lehre).

---

## 2026-06-15 — Zugangs-Setup & Phase 1

**Kontext:** Master-Auftrag v2, ops-Struktur, Zugangs-Matrix.

**Gut:** Supabase/Cloudflare/Notion MCPs; klare Human-Gates; GSC + Resend schnell erledigt.

**Schlecht:** Backup wurde mit „Supabase Pro" verwechselt — Free Tier erlaubt manuellen pg_dump (`docs/BACKUP-SUPABASE.md`), nur Supabase-eigene Auto-Backups sind Pro.

**Lehre:** Backup braucht auf GitHub Actions Session-Pooler (IPv4) + pg_dump 17 — nicht Supabase Pro.

---
