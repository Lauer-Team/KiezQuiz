# Legal-Koordination — KiezQuiz

> **Rolle Kalle:** Du führst **kein** Recht aus — du **erkennst Bedarf**, **koordinierst Legora** und **integrierst** freigegebene Texte.

---

## Ablauf (immer gleich)

```
Trigger erkannt → Backlog-Eintrag → Legal-Arbeitsauftrag (Legora) → Du in Legora → Freigabe → Kalle integriert (PR) → Dein OK → Live
```

| Schritt | Wer | Was |
|---|---|---|
| 1 | **Kalle** | Trigger erkannt, `ops/legal/BACKLOG.md` aktualisiert |
| 2 | **Kalle** | Legal-Arbeitsauftrag schreiben (siehe Vorlage unten) |
| 3 | **Du** | Auftrag in **Legora** (Projekt KiezQuiz) ausführen |
| 4 | **Du** | Ergebnis prüfen + freigeben |
| 5 | **Kalle** | Texte technisch einbauen (Branch + PR) |
| 6 | **Du** | Merge-Freigabe (Gate: öffentlich sichtbar) |

---

## Legal-Arbeitsauftrag (Vorlage)

Kalle liefert dir bei Bedarf einen Block in diesem Format:

```markdown
## Legal-Arbeitsauftrag — [Thema]

**Ziel:** …
**Warum jetzt:** …
**Kontext für Legora:** …
**Betroffene Stellen im Produkt:** …
**Was Legora liefern soll:** …
**Was du Kalle zurückgeben sollst:** … (Datei/Link/Freigabe ja/nein)
```

---

## Proaktive Pflichten von Kalle

- Bei **jedem Feature-PR:** Trigger-Checkliste (`ops/legal/TRIGGERS.md`)
- Bei **NB/DSE/Impressum-Änderungen:** `terms-change-notify.mdc` + 30-Tage-Regel
- **Quartalsweise:** Backlog reviewen — veraltete Texte? Neue Gesetze/Features?
- **Vor Monetarisierung:** AGB, Widerruf, Zahlungsanbieter — Legora-Pflicht
- **Vor App Store:** Apple/Google-Richtlinien, Datenschutz App

---

## Was in Legora bleibt

- Formulierung Rechtstexte
- Compliance-Check
- Vertrags-/AGB-Review
- Rechtliche Bewertung neuer Features

---

## Was Kalle im Repo macht

- Trigger erkennen + Backlog
- Technische Integration (HTML, JSON, i18n)
- NB-E-Mail-Prozess vorbereiten (`notify_terms_change.py --dry-run`)
- TOM-Doku (`docs/TOM-KiezQuiz.md`) technisch aktuell halten
- **Nie** „rechtssicher" behaupten ohne Legora-Freigabe

---

## Referenzen

- `ops/legal/TRIGGERS.md` — Wann Legal nötig
- `ops/legal/BACKLOG.md` — Offene Punkte
- `docs/TERMS-CHANGE-PROCESS.md` — NB-Änderungen
- `src/data/legalConfig.js` — Versionen, effectiveDate
