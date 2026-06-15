# Legal-Trigger — Wann Kalle Legal anstoßen muss

> Bei **einem Ja** → Eintrag in `ops/legal/BACKLOG.md` + ggf. Legal-Arbeitsauftrag für Legora.

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
