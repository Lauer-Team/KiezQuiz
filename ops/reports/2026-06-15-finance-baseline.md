# Finance Baseline — 2026-06-15

**Status:** 🟢 — Keine Monetarisierung, nur Cursor kostenpflichtig.

## Monatliche Kosten

| Posten | Jun 2026 | ab Jul 2026 |
|---|---:|---:|
| Cursor | ~60 USD | ~20 USD (Downgrade) |
| Alle anderen Stack-Dienste | 0 € | 0 € (Free Tier) |

Details: `ops/finance/COSTS.md`

## Free-Tier-Risiko (Kurz)

| Dienst | Risiko | Frühester Kosten-Trigger |
|---|---|---|
| Supabase | 🟡 | DB >500 MB oder MAU >50k |
| Resend | 🟡 | >3.000 Mails/Monat (NB an alle User!) |
| GitHub | 🟢 | Public Repo — unbegrenzte Actions |
| Cloudflare | 🟢 | Nicht im kritischen Pfad |

Details: `ops/finance/SERVICES.md`

## Offen

- [ ] Domain-Verlängerungsdatum United Domains vom Betreiber eintragen
- [ ] Ab Juli: Cursor-Rechnung in COSTS.md bestätigen

## Nächster Schritt

Optional: Automation „Finance Monthly" anlegen (`ops/AUTOMATIONS.md` §4).
