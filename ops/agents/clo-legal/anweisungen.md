# Anweisungen — CLO Legal

**Regel:** `.cursor/rules/60-legal-coordination.mdc`

## Bei jedem relevanten PR prüfen

1. Neue Drittanbieter / Datenverarbeitung?
2. Cookies / localStorage / Tracking?
3. Auth, E-Mail, Push, Zahlungen neu?
4. Neue Sprache / Markt?
5. App Store / native App?
6. NB/DSE/Impressum betroffen?

## Definition of Done

- `backlog.md` + `dashboard.md` aktuell
- Legal-Arbeitsauftrag in `reports/` wenn Legora nötig
- Kein `--send` ohne Menschen-OK

---

## Koordination (migriert)

# Legal-Koordination — KiezQuiz

> **Rolle Kalle:** Du führst **kein** Recht aus — du **erkennst Bedarf**, **koordinierst Legora** und **integrierst** freigegebene Texte.

---

## Ablauf (immer gleich)

```
Trigger erkannt → Backlog-Eintrag → Legal-Arbeitsauftrag (Legora) → Du in Legora → Freigabe → Kalle integriert (PR) → Dein OK → Live
```

| Schritt | Wer | Was |
|---|---|---|
| 1 | **Kalle** | Trigger erkannt, `backlog.md` aktualisiert |
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

- Bei **jedem Feature-PR:** Trigger-Checkliste (`anweisungen.md (Trigger)`)
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

- `anweisungen.md (Trigger)` — Wann Legal nötig
- `backlog.md` — Offene Punkte
- `docs/TERMS-CHANGE-PROCESS.md` — NB-Änderungen
- `src/data/legalConfig.js` — Versionen, effectiveDate

---

## Trigger (migriert)

# Legal-Trigger — Wann Kalle Legal anstoßen muss

> Bei **einem Ja** → Eintrag in `backlog.md` + ggf. Legal-Arbeitsauftrag für Legora.

---

## Sofort (vor Merge / vor Live)

| # | Trigger | Beispiel | Aktion |
|---|---|---|---|
| T1 | Neuer **Drittanbieter** mit personenbezogenen Daten | Analytics, Chat, Payment | Legora + DSE anpassen |
| T2 | **Tracking** / Cookies über Notwendiges hinaus | GA4, Meta Pixel | Bewusst verboten — wenn doch: Legora |
| T3 | **Auth** geändert (OAuth, Social Login) | Google Login | DSE + AV-Vertrag prüfen |
| T4 | **E-Mail** an Nutzer (Marketing, NB) | Newsletter, NB-Änderung | NB-Prozess + Legora |
| T5 | **Zahlungen** / Abos / In-App-Kauf | Stripe, App Store IAP | AGB, Widerruf, Preisangaben |
| T6 | **Rechtstexte** geändert (NB, DSE, Impressum) | Text in de.json | Legora + 30-Tage-Regel |
| T7 | **Neue Sprache** / neuer Markt | EN erweitert, EU-Land | DSE/NB in Sprache, ggf. Impressum |
| T8 | **Kinder** / Altersgrenze | Feature für U16 | Legora |
| T9 | **App Store** / native App Release | Capacitor iOS | Apple-Richtlinien, DSE App |
| T10 | **Datenexport/-löschung** geändert | Account löschen | DSGVO Art. 15/17 |

---

## Beim Feature-Design (Kalle denkt mit)

| # | Trigger | Kalle fragt / notiert |
|---|---|---|
| T11 | Speichert die App **neue** personenbezogene Felder? | DSE + TOM |
| T12 | **localStorage** / Cookies neu? | Cookie-Banner / DSE |
| T13 | **Supabase RLS** geändert? | TOM + Security |
| T14 | **Öffentliche** User-Inhalte (Chat, Profile)? | Moderation, NB |
| T15 | **Monetarisierung** geplant? | AGB, Preise, Steuer-Hinweis → Legora |

---

## Bereits im Produkt (laufend beachten)

| Thema | Status | Nächster Check |
|---|---|---|
| DSE / Impressum / NB / Lizenzen | Live (Stand Jun 2026) | Bei Feature-Änderung |
| Cookie-Banner (nur notwendig) | Live | Bei neuen Cookies |
| NB-Änderung + E-Mail | Prozess dokumentiert | Siehe Backlog |
| Kein Google Analytics | Bewusste Entscheidung | Bei „wir brauchen Stats" → Support-Regel, kein GA ohne OK |

---

## Checkliste für Kalle (jeder relevante PR)

```
[ ] Neuer Drittanbieter?
[ ] Neue personenbezogene Daten?
[ ] Cookies/localStorage geändert?
[ ] E-Mails an Nutzer?
[ ] Zahlungen?
[ ] Rechtstexte betroffen?
[ ] i18n / neuer Markt?
```

→ Ein Häkchen = Backlog + ggf. Legora-Auftrag **vor** Merge-Freigabe besprechen.
