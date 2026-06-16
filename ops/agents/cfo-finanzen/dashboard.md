# Dashboard — Frida (CFO)

**Status:** 🟢  
**Lage:** Cursor + Hetzner (10,70 €/Monat). Free-Tier-Services in `transactions.csv` (typ service-gratis).  
**Rolle:** Überwacht Kosten und Abos, damit nichts unbemerkt teuer wird oder Free-Tier-Grenzen reißt.

## KPIs

| Kennzahl | Wert | Ziel | Status | Verlauf | Quelle |
|---|---|---|---|---|---|
| Kosten / Monat | 66 € | 29 € | 🟡 | 66,66,29 | manuell |
| Genutzte Services | 4 | — | 🟢 |  | manuell |
| Supabase-Auslastung | Free-Tier | <80% | 🟢 |  | live (grob) |
| Resend (E-Mail) | Free-Tier | <80% | 🟡 |  | manuell |

## Projekte

| Projekt | Status | Fortschritt | Termin |
|---|---|---|---|
| Transaktionsbuch (`transactions.csv`) | live | 100% | — |
| Cursor-Downgrade Pro+ → Pro | geplant | 0% | 2026-07-01 |
| Monetarisierung (Kostenplan) | Konzept | 10% | offen |

## Automations

| # | Name | Cron | Aufgabe |
|---|---|---|---|
| 5 | Finance Monthly | `0 8 1 * *` | Kosten, Free-Tier, SERVICES.md |
