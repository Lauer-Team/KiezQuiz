# Backlog — CFO Finanzen

| Thema | Priorität | Nächster Schritt |
|---|---|---|
| Supabase Pro evaluieren | ⚪ | Erst bei Quota-Engpass + Umsatz |
| Resend Paid | ⚪ | Erst bei >3.000 Mails/Monat oder NB an alle User |
| Apple Developer (99 USD/Jahr) | ⚪ | Erst bei App Store |
| Buchhaltungs-Export | ⚪ | Bei erstem Umsatz |

Upgrade-Gates: siehe `leitstand.md (SERVICES)` § Upgrade-Gates

---

## Monetarisierung (migriert)

# Monetarisierung — KiezQuiz (Referenzplan)

> **Status:** Aufgeschoben · **Stand:** 2026-06-15  
> **Zweck:** Wenn du irgendwann Umsatz willst — hier steht der Fahrplan. Nichts davon ist live oder verbindlich.

Siehe auch: [`ops/agents/ceo-kalle/backlog.md`](../ROADMAP.md) · [`backlog.md`](../legal/BACKLOG.md) L3 · [`leitstand.md (SERVICES)`](../finance/SERVICES.md)

---

## Ausgangslage

| | |
|---|---|
| **Produkt** | Kostenlose Karten-Quiz-WebApp (Hamburg, Berlin, Frankfurt, …) |
| **Nutzer** | Spieler mit optionalem Account (Supabase Auth) |
| **Datenschutz** | Kein Google Analytics, Cookie-Banner nur „notwendig" |
| **Kanäle** | Web (kiezquiz.de), Capacitor-iOS geplant |
| **Kosten heute** | Vor allem Cursor (~55→~18 USD/Monat ab Jul 2026) |

**Stärken für Monetarisierung:** Lokaler Bezug, wiederkehrendes Spiel, Auth-Infrastruktur, App-Store-Potenzial, QR-Sticker (Flyeralarm) als Offline-Marketing.

---

## Leitprinzipien (Empfehlung)

1. **Free Core bleibt free** — bestehende Städte/Modi nicht hinter Paywall; Vertrauen und SEO nicht riskieren.
2. **Premium = Mehrwert, nicht Pay-to-Win** — neue Städte, Extra-Modi, Kosmetik, Offline-Packs — kein „bezahlen oder verlieren".
3. **Recht vor Code** — erst Legora (AGB, Widerruf, Preise), dann Zahlungsanbieter, dann Feature.
4. **Ein Zahlungsweg** — nicht drei Provider parallel am Anfang.

---

## Optionen (Nutzen / Aufwand / Legal)

| Option | Nutzen | Aufwand | Legal |
|---|---|---|---|
| **A — Premium-Städte / Stadt-Packs** | Skalierbar, passt zum Produkt | mittel (Content + Unlock-Logik) | AGB + Preisangaben + Widerruf |
| **B — Spende / „Unterstütze KiezQuiz"** | Geringster Einstieg | gering | Impressum/Transparenz; ggf. Spenden-Hinweis |
| **C — B2B (Schulen, Stadtmarketing)** | Höherer Ticket, weniger Nutzer | hoch (Vertrieb) | Vertrag + Rechnung + ggf. USt |
| **D — App-Store-IAP (iOS)** | Apple-Nutzer zahlen gewohnt | hoch (Capacitor + Review) | App-DSE, Apple-Richtlinien (L4) |
| **E — Werbung** | Schnelles Geld | gering technisch | **Nicht empfohlen** — widerspricht Datenschutz-Story |

**Empfehlung für den Start:** **B testen** (Spende, kein Feature-Gate) **oder** direkt **A** (ein Premium-Stadt-Pack), wenn du ernsthaft skalieren willst.

---

## Phasenplan

### Phase 0 — Entscheidung (du)

- [ ] Willst du überhaupt Geld verdienen — oder reicht „Hobby mit minimalen Kosten"?
- [ ] Welche Option (A/B/C/D) passt zu deinem Ziel?
- [ ] Kleinunternehmer §19 UStG — mit Steuerberater klären, sobald Umsatz real wird.

### Phase 1 — Legal (Legora, Gate: du)

**Legal-Arbeitsauftrag L3** — vor erstem Cent:

| Dokument | Warum |
|---|---|
| AGB (Paid) | Vertragsschluss, Leistungsbeschreibung, Kündigung |
| Widerrufsbelehrung | B2C digital → 14-Tage-Widerruf |
| Preisangaben | Preis inkl. MwSt., Endpreis vor Kauf |
| DSE-Ergänzung | Zahlungsanbieter, Rechnungsdaten |
| Impressum | ggf. USt-IdNr. später |

**Ergebnis:** Freigegebene Texte → Kalle integriert als PR → dein Merge-OK.

### Phase 2 — Zahlungs-Infrastruktur (Kalle, Gate: Anbieter-Account)

| Anbieter | Pro | Contra |
|---|---|---|
| **Stripe** | Standard, gute Doku, EU | Merchant-Setup, Gebühren ~1,5 %+ 0,25 € |
| **Lemon Squeezy / Paddle** | MoR, weniger Steuer-Headache | Höhere Gebühr, weniger Kontrolle |
| **PayPal** | Nutzer kennen es | Schlechtere UX für Abos |

**Empfehlung:** Stripe Checkout für Web; App Store IAP separat wenn iOS live.

Technisch (Web):

- Supabase: `purchases` / `entitlements` Tabelle + RLS
- Edge Function: Stripe Webhook → Entitlement setzen
- UI: „Freischalten"-Button → Checkout Session

**Kosten neu:** Stripe 0 € Fix + Transaktionsgebühr; ggf. Supabase Pro erst bei Wachstum.

### Erst mit Umsatz freischalten (bewusst Free Tier)

| Feature | Anbieter | Warum warten |
|---|---|---|
| **HaveIBeenPwned** | Supabase Auth | Nur **Pro** — ROADMAP R6 |
| **Supabase Pro** | Supabase | Quotas/Backups — erst bei Wachstum oder Umsatz |
| **GSC API** | Google Cloud | 0 €, aber Setup — Standard ist manueller GSC-Check |

### Phase 3 — MVP Paid Feature (Branch + PR)

**Minimal viable:** Ein **Premium-Stadt-Pack** (z. B. München) oder **„Alle Städte"-Bundle**.

| Schritt | Was |
|---|---|
| 1 | `entitlements` in Supabase (user_id, sku, expires_at) |
| 2 | Stadt-Registry: `premium: true` + Unlock-Check in App |
| 3 | Checkout-Button + Erfolgs-/Abbruch-Seite |
| 4 | Admin: manuell freischalten (Support-Fallback) |
| 5 | `leitstand.md (COSTS)` + SERVICES.md aktualisieren |

**Kein Deploy ohne:** Legora-Freigabe + dein Merge-OK.

### Phase 4 — iOS (später, L4)

- Capacitor-App: StoreKit / RevenueCat evaluieren
- Apple 30 % (15 % Small Business Program prüfen)
- App-spezifische DSE in Legora

### Phase 5 — Messen & Optimieren

- **Ohne GA:** Umsatz in Stripe Dashboard; aktive Premium-Nutzer in Supabase
- Monatlicher Finance-Bericht (Automation §4)
- Support-Bericht: Support-Anfragen zu Zahlung (Automation §5)

---

## Grobe Wirtschaftlichkeit (Daumen)

| Annahme | Beispiel |
|---|---|
| Premium-Stadt | 2,99 € einmalig |
| 100 Käufe/Jahr | ~299 € brutto |
| Stripe-Gebühr | ~−15 € |
| **Netto vor Steuer** | ~284 € — deckt Cursor-Jahresabo locker |

Skalierung braucht Marketing (Community-Launch-Checkliste in `docs/SEO-SETUP.md`) — kein Paid Ads nötig am Anfang.

---

## Abhängigkeiten & Reihenfolge

```
Entscheidung (du) → Legora L3 → Stripe-Account (du) → MVP-PR (Kalle) → Merge (du)
```

Parallel möglich: Spenden-Link (Phase B) mit minimalem Legal-Check — schneller als Voll-AGB-Paket.

---

## Was Kalle **nicht** ohne dich tut

- Zahlungsanbieter-Account eröffnen
- Preise festlegen
- AGB/Rechtstexte schreiben oder live stellen
- Merge auf `main` / Live-Schaltung Paid Feature
