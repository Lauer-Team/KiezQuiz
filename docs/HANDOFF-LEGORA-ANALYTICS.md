# Handoff an Legora — First-Party Web-Analytics (KiezQuiz)

**Datum:** 19. Juni 2026  
**Antragsteller:** Jeremiah J. Lauer  
**Repos:** KiezQuiz (öffentlich) · KiezQuiz-Ops (privat, GSC-Cron)  
**Status Technik:** Implementiert — **rechtlich noch nicht freigegeben / nicht live-kommuniziert**

---

## 1. Zusammenfassung für Legora

Wir haben ein **kostenloses First-Party-Analytics-System** in **Supabase EU** gebaut, um drei Fragen zu beantworten:

1. **Wie oft findet mich Google?** (Google Search Console, täglich per Cron)
2. **Wie viele Leute besuchen kiezquiz.de?** (Seitenaufrufe, unique visitors)
3. **Wie oft wird gespielt — von wem?** (Runden pro Account und pro Gast)

Zusätzlich: **Zuordnung pro Nutzer/Gast** über bestehende `guest_id` (localStorage) bzw. `user_id` (Account).

**Wichtig:** Die Website sagt aktuell ausdrücklich **„Kein Tracking“** (Datenschutzerklärung, Cookie-Hinweis, Footer). Die Technik ist vorbereitet; **öffentliche Rechtstexte wurden bewusst nicht geändert** — das ist deine Aufgabe vor Go-Live.

---

## 2. Was technisch neu ist

### 2.1 Neue Datenverarbeitung

| Daten | Zweck | Betroffene | Speicherort | Geplant Speicherdauer |
|-------|-------|------------|-------------|------------------------|
| Seitenaufruf (Pfad, Zeit, Referrer-Domain) | Besucherstatistik | Alle Website-Besucher | Supabase EU | Roh-Events 90 Tage* |
| `guest_id` (UUID in localStorage, bereits für Stadt-Wünsche) | Zuordnung Gast-Aktivität | Gäste | Supabase EU | Bis Opt-out / Browser-Löschung |
| `session_id` (sessionStorage, pro Tab) | Unique-Visitor-Zählung | Alle | Nur Browser | Tab-Ende |
| `user_id` (bei Login) | Zuordnung Account-Aktivität | Registrierte | Supabase EU | Bis Account-Löschung |
| Spielrunde (Stadt, Modus, Score, Dauer, Zeit) | Spielvolumen | Gäste + Accounts | `player_game_log` | Wie Account / Gast |
| GSC Klicks/Impressionen (aggregiert, täglich) | SEO-KPI | Keine Personenbezogenheit | Supabase EU | 2 Jahre* |

\*Retention noch nicht per Cron automatisiert — in TOM/VVT festlegen.

**Nicht gespeichert:** IP-Adressen, Geräte-Fingerprinting, Werbe-Profile, Drittanbieter-Analytics (kein GA, kein Plausible).

### 2.2 Supabase-Tabellen & RPCs

SQL-Migration: `docs/sql/analytics.sql`

| Objekt | Funktion |
|--------|----------|
| `analytics_events` | Roh-Events (page_view, session_start) |
| `analytics_gsc_daily` | Google-Klicks/Impressionen pro Tag |
| `analytics_daily` | Tages-Aggregate (Besucher, Aufrufe, Spiele, GSC) |
| `log_analytics_batch` | Client sendet Event-Batches (anon + authenticated) |
| `log_player_game` | Spielrunde (erweitert: auch Gäste mit `p_guest_id`) |
| `link_guest_analytics` | Bei Login: Gast-Historie → Account verknüpfen |
| `upsert_analytics_gsc_daily` | Nur Service Role (VPS-Cron) |
| `get_admin_analytics_*` | Admin-Dashboard (nur `is_city_wish_admin`) |

### 2.3 Client & Cron

| Komponente | Pfad |
|----------|------|
| Page-View-Tracking | `src/kiezAnalytics.js` |
| Spiel-Logging (Gäste) | `src/playerActivity.js` |
| Admin-UI | Profil → Admin → „Besucher & Statistik“ |
| GSC → Supabase | `KiezQuiz-Ops/scripts/sync_gsc_to_supabase.py` (täglich/wöchentlich via `seo_daily.py` / `seo_check.py`) |
| Einrichtung | `docs/ANALYTICS-SETUP.md` |

### 2.4 Opt-out (technisch, noch ohne UI/Legal-Text)

```js
localStorage.setItem('kiezquiz_analytics_optout', '1');
```

API: `window.kiezAnalytics.setOptOut(true)`

---

## 3. Abweichung von der bisherigen Rechtslage

### 3.1 Aktuelle öffentliche Aussagen (Stand 16.06.2026)

| Dokument | Aussage |
|----------|---------|
| Datenschutzerklärung (`src/locales/de.json` → `legalPages.privacy`) | „Wir setzen **kein Tracking**, kein Google Analytics und keine Werbe-Cookies ein.“ |
| Cookie-Hinweis (`src/ui/cookieConsent.js`) | „**Kein Tracking**, keine Werbe-Cookies.“ |
| Footer | „Keine Tracking-Cookies.“ |
| VVT (`docs/VVT-KiezQuiz.md`) | Keine Verarbeitungstätigkeit „Web-Analytics“ |
| DSFA (`docs/DSFA-Pruefung.md`) | Kriterium #7 (Datenverknüpfung) = Nein |

### 3.2 Was sich faktisch ändert

- **Neuer Verarbeitungszweck:** Nutzungsstatistik / Betriebsauswertung
- **Pseudonymisierung:** `guest_id` ist personenbezogen i. S. d. DSGVO (rechtlich zu bewerten)
- **Verknüpfung:** Pageviews + Spiele + (bestehend) Stadt-Wünsche über dieselbe `guest_id`
- **Kein neues Cookie:** Wiederverwendung bestehender `guest_id` in localStorage — aber **neuer Zweck** (nicht nur Stadt-Wünsche)

---

## 4. Rechtsfragen an Legora (bitte beantworten)

### 4.1 Rechtsgrundlage

| Verarbeitung | Vorschlag Technik-Team | Eure Bewertung? |
|--------------|------------------------|-----------------|
| Aggregierte Tages-KPIs (ohne Actor) | Art. 6 Abs. 1 lit. f DSGVO | ? |
| Seitenaufrufe mit `guest_id` | lit. f + dokumentierte Interessenabwägung | ? |
| Spielrunden Gäste | lit. f (analog VVT §9 Spielaktivitäts-Protokoll) | ? |
| Verknüpfung Gast → Account bei Login | lit. b (Vertrag) | ? |
| GSC-Daten (aggregiert) | Keine Personenbezogenheit / lit. f | ? |

**Kernfrage:** Reicht **berechtigtes Interesse (lit. f)** + **Opt-out**, oder ist **Einwilligung** nach **TDDDG § 25** erforderlich?

### 4.2 DSFA (Art. 35 DSGVO)

Bitte WP248-Kriterien neu prüfen:

| Kriterium | Mögliche Relevanz |
|-----------|-------------------|
| #7 Verknüpfung von Datensätzen | **Ja** — Pageviews + Spiele + Stadt-Wünsche via `guest_id` |
| #8 Umfangreiche Verarbeitung | Vermutlich nein (kleine App) |

**Frage:** Reicht Neubewertung der Schwellenwertprüfung, oder vollständige DSFA?

### 4.3 Transparenz & Einwilligung

1. Welche Formulierung für **neuen DSE-Abschnitt** „Nutzungsstatistik“ (DE + EN)?
2. Cookie-/Hinweis-Banner: Opt-out-Link reicht, oder Opt-in vor erstem Event?
3. Muss der Footer-Text „Keine Tracking-Cookies“ komplett ersetzt werden?
4. **App Store / Capacitor:** `docs/APP-STORE-PRIVACY-LABELS.md` und `PrivacyInfo.xcprivacy` (KIE-39) anpassen?

### 4.4 Betroffenenrechte

| Recht | Umsetzung (Vorschlag) |
|-------|----------------------|
| Auskunft | Admin kann Actor sehen; Gast ohne Account: Auskunft über `guest_id`? |
| Löschung Account | Cascade auf `analytics_events` + `player_game_log` (user_id) |
| Löschung Gast | RPC `delete_guest_analytics(guest_id)` — noch nicht implementiert, bei Bedarf |
| Widerspruch Art. 21 | Opt-out-Mechanismus (`kiezquiz_analytics_optout`) |

### 4.5 Go-Live-Freigabe

- [ ] Rechtsgrundlage festgelegt
- [ ] Opt-in vs. Opt-out festgelegt
- [ ] DSFA: ja/nein
- [ ] DSE DE/EN freigegeben
- [ ] Banner/Footer freigegeben
- [ ] VVT + TOM aktualisiert
- [ ] App Store Labels (falls relevant)

---

## 5. Dokumente, die Legora / Betreiber anpassen müssen

**Nicht vom Entwickler geändert (bewusst):**

- [ ] `src/locales/de.json` + `en.json` — `legalPages.privacy`
- [ ] `src/ui/cookieConsent.js` — Banner-Text
- [ ] `datenschutz/index.html` — statischer Fallback
- [ ] `index.html` + Stadtseiten — Footer „Keine Tracking-Cookies“
- [ ] `docs/VVT-KiezQuiz.md` — neue VT (z. B. §11 Web-Analytics)
- [ ] `docs/DSFA-Pruefung.md` — Neubewertung
- [ ] `docs/TOM-KiezQuiz.md` — Retention, Zugriffskontrolle
- [ ] `docs/APP-STORE-PRIVACY-LABELS.md`
- [ ] KiezQuiz-App-Repo: `PrivacyInfo.xcprivacy`

---

## 6. Technische Referenzen (zum Selbstrecherchieren)

| Thema | Datei |
|-------|-------|
| SQL-Schema | `KiezQuiz/docs/sql/analytics.sql` |
| Client-Tracking | `KiezQuiz/src/kiezAnalytics.js` |
| Spiel-Logging | `KiezQuiz/src/playerActivity.js` |
| Admin-UI | `KiezQuiz/src/ui/adminSections.js` (Abschnitt Analytics) |
| GSC-Sync | `KiezQuiz-Ops/scripts/sync_gsc_to_supabase.py` |
| Ops-Einrichtung | `KiezQuiz/docs/ANALYTICS-SETUP.md` |
| Bisherige DSE | `KiezQuiz/src/locales/de.json` → `legalPages.privacy.sections` |
| Bisheriger VVT | `KiezQuiz/docs/VVT-KiezQuiz.md` |
| GSC-Automatisierung | `KiezQuiz/docs/GSC-API-SETUP.md` |
| Supabase AVV | Supabase DPA (bereits akzeptiert 10.06.2026) |

---

## 7. Risiko-Einschätzung (vorläufig, keine Rechtsberatung)

| Risiko | Stufe | Anmerkung |
|--------|-------|-----------|
| Widerspruch zur bisherigen „Kein Tracking“-Kommunikation | **Hoch** | DSE/Banner vor aktivem Tracking |
| TDDDG / Einwilligung | **Mittel** | First-Party, kein Cookie — dennoch neuer Zweck für guest_id |
| DSFA-Pflicht | **Mittel** | Datenverknüpfung möglich |
| Abmahnrisiko bei vorzeitigem Tracking ohne Anpassung | **Hoch** | Technik deployen OK, Transparenz muss folgen |

---

## 8. Empfohlene Reihenfolge (Betrieb)

1. **Legora:** Dieses Dokument prüfen → Go/No-Go + Formulierungen
2. **Betreiber:** Rechtstexte anpassen (siehe §5)
3. **Supabase:** `docs/sql/analytics.sql` ausführen (falls noch nicht)
4. **Deploy:** KiezQuiz auf `main` pushen
5. **VPS:** `KIEZQUIZ_SUPABASE_SERVICE_ROLE_KEY` in `.env` — GSC-Sync läuft mit
6. **Verifizieren:** Admin → Besucher & Statistik

---

## 9. Kontakt

Jeremiah J. Lauer · info@kiezquiz.de

---

*Internes Handoff-Dokument — nicht auf kiezquiz.de veröffentlichen.*
