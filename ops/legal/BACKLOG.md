# Legal-Backlog — KiezQuiz

> **Hinweis:** Primäre Akte: [`../agents/clo-legal/backlog.md`](../agents/clo-legal/backlog.md)  
> Diese Datei bleibt als Referenz/Spiegel für Legora-Workflow.

> Offene und geplante Legal-Themen. Kalle pflegt proaktiv — du arbeitest in **Legora**.

| ID | Thema | Priorität | Status | Nächster Schritt | Legora? |
|---|---|---|---|---|---|
| L1 | **NB-Änderung Benachrichtigung** | 🟢 | **Erledigt** | E-Mails am **10.06.2026** versendet · `lastNotifiedVersion: 2026-06-10` | — |
| L2 | **NB wirksam ab 11.07.2026** | 🟡 | Laufend | Gäste-Banner (`pendingNotice: true`) bis Inkrafttreten · danach `deactivate_terms_notice.py` | — |
| L3 | **Monetarisierung (Zukunft)** | ⚪ | Aufgeschoben | Vor erstem Paid Feature: AGB, Widerruf, Preisangaben | Ja, wenn geplant → [`ops/plans/MONETIZATION.md`](../plans/MONETIZATION.md) |
| L4 | **App Store (Capacitor iOS)** | ⚪ | Backlog | Vor Release: Apple-Richtlinien, App-DSE | Ja |
| L5 | **Supabase RLS WARNs** | 🟡 | Beobachten | Security-Weekly — kein Legal-Text, aber TOM | Optional TOM-Update |

---

## Erledigt (Referenz)

| ID | Thema | Erledigt |
|---|---|---|
| — | Impressum, DSE, NB, Lizenzen live | 2026-06-10 |
| — | Cookie-Banner (notwendig only) | 2026-06 |
| — | TOM-Dokumentation | `docs/TOM-KiezQuiz.md` |
| L1 | NB-E-Mail an registrierte Nutzer (Version 2026-06-10) | 2026-06-10 |

---

## Hinweis zu L1/L2 (häufige Verwechslung)

- **E-Mail-Versand (L1)** ist **fertig** — nichts Neues seit dem 10.06.2026.
- **`pendingNotice: true`** ist **absichtlich** — gelber Hinweis für **Gäste ohne Account** bis zum 11.07.2026 (§ 10 NB).
- **Ab 12.07.2026:** Automation/Kalle führt `scripts/deactivate_terms_notice.py --apply` aus (siehe `ops/DEADLINES.md` D4).

---

## Legal-Arbeitsauftrag-Vorlagen (bei Bedarf)

Kalle erstellt bei L3/L4 einen konkreten Auftrag in `ops/reports/` oder als PR-Kommentar — du führst ihn in Legora aus.
