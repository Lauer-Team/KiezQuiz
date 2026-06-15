# Dashboard — Frida (CFO)

**Status:** 🟢  
**Lage:** 4 Services im Einsatz, ~55 €/Monat. Sinkt ab Juli auf ~18 € (Cursor-Downgrade). Keine Free-Tier-Grenze in Gefahr.  
**Rolle:** Überwacht Kosten und Abos, damit nichts unbemerkt teuer wird oder Free-Tier-Grenzen reißt.

## KPIs

| Kennzahl | Wert | Ziel | Status | Verlauf | Quelle |
|---|---|---|---|---|---|
| Kosten / Monat | 55 € | 18 € | 🟡 | 55,55,55,18 | manuell |
| Genutzte Services | 4 | — | 🟢 |  | manuell |
| Supabase-Auslastung | Free-Tier | <80% | 🟢 |  | live (grob) |
| Resend (E-Mail) | Free-Tier | <80% | 🟡 |  | manuell |

## Projekte

| Projekt | Status | Fortschritt | Termin |
|---|---|---|---|
| Cursor-Downgrade Pro+ → Pro | geplant | 0% | 2026-07-01 |
| Monetarisierung (Kostenplan) | Konzept | 10% | offen |

## Automations

| # | Name | Cron | Aufgabe |
|---|---|---|---|
| 5 | Finance Monthly | `0 8 1 * *` | Kosten, Free-Tier, SERVICES.md |
