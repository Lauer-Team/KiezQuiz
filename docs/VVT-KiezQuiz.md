# Verzeichnis der Verarbeitungstätigkeiten (VVT)

**Verantwortlicher:** Jeremiah J. Lauer, Schoenaich-Carolath-Str. 1, 22607 Hamburg  
**Stand:** 10. Juni 2026  
**Website:** https://kiezquiz.de

> Internes Dokument gemäß Art. 30 DSGVO. Nicht öffentlich — archivieren (Notion, Ordner „Rechtsdokumente“).

---

## 1. Website-Betrieb (Hosting)

| Feld | Inhalt |
|------|--------|
| **Zweck** | Bereitstellung der statischen Website |
| **Kategorien betroffener Personen** | Website-Besucher |
| **Kategorien personenbezogener Daten** | IP-Adresse, Zeitpunkt, URL, User-Agent, Referrer (Server-Logs) |
| **Rechtsgrundlage** | Art. 6 Abs. 1 lit. f DSGVO |
| **Empfänger** | GitHub Inc. (Microsoft), USA — GitHub Pages |
| **Drittlandübermittlung** | USA; SCCs / Microsoft DPA |
| **Speicherdauer** | Server-Logs max. 30 Tage |
| **TOMs** | HTTPS, 2FA Admin-Zugänge (siehe TOM-Dokument) |
| **DSFA erforderlich** | Nein — siehe `docs/DSFA-Pruefung.md` (10.06.2026) |

---

## 2. Spielen ohne Account (localStorage)

| Feld | Inhalt |
|------|--------|
| **Zweck** | Lokale Speicherung von Spielstand und Einstellungen |
| **Betroffene** | Gast-Nutzer |
| **Daten** | Spielstand, Theme, Sprache, Sound, technische Marker |
| **Rechtsgrundlage** | § 25 Abs. 2 Nr. 2 TDDDG |
| **Empfänger** | Keine (nur Browser des Nutzers) |
| **Speicherdauer** | Bis Löschung durch Nutzer im Browser |
| **DSFA erforderlich** | Nein — siehe `docs/DSFA-Pruefung.md` |

---

## 3. Optionaler Nutzer-Account

| Feld | Inhalt |
|------|--------|
| **Zweck** | Authentifizierung, Cloud-Spielstand, Freunde, Bestenlisten |
| **Betroffene** | Registrierte Nutzer (ab 16 Jahren) |
| **Daten** | E-Mail, Benutzername, Passwort-Hash, Spielstand (JSON), Freundesliste, Stadt-Wünsche |
| **Rechtsgrundlage** | Art. 6 Abs. 1 lit. b DSGVO |
| **Empfänger** | Supabase Inc. — EU West Europe (Irland, eu-west-1) |
| **AVV/DPA** | Supabase DPA akzeptiert (10.06.2026) |
| **Speicherdauer** | Bis Account-Löschung durch Nutzer |
| **DSFA erforderlich** | Nein — siehe `docs/DSFA-Pruefung.md` |

---

## 4. Server-Logs Supabase

| Feld | Inhalt |
|------|--------|
| **Zweck** | Sicherheit, Fehleranalyse, Betrieb der Datenbank |
| **Daten** | IP, Zeitstempel, Request-Metadaten |
| **Rechtsgrundlage** | Art. 6 Abs. 1 lit. f DSGVO |
| **Empfänger** | Supabase Inc., EU (Irland) |
| **Speicherdauer** | Max. 30 Tage (Supabase-Standard) |
| **DSFA erforderlich** | Nein — siehe `docs/DSFA-Pruefung.md` |

---

## 5. Bestenliste / öffentlicher Benutzername

| Feld | Inhalt |
|------|--------|
| **Zweck** | Gamification, soziales Spielerlebnis |
| **Daten** | Benutzername, Spielergebnisse (Stadt, Punkte, Zeit) |
| **Rechtsgrundlage** | Art. 6 Abs. 1 lit. b DSGVO |
| **Empfänger** | Andere registrierte Nutzer (sichtbar in Bestenlisten) |
| **Speicherdauer** | Bis Account-Löschung |
| **DSFA erforderlich** | Nein — siehe `docs/DSFA-Pruefung.md` |

---

## 6. Stadtbezirk-Wünsche

| Feld | Inhalt |
|------|--------|
| **Zweck** | Feature-Planung (welche Städte Nutzer wünschen) |
| **Daten** | Stadtname, optional user_id oder Gast-ID, Zeitstempel |
| **Rechtsgrundlage** | Art. 6 Abs. 1 lit. f DSGVO |
| **Empfänger** | Intern (Admin über geschützte RPC) |
| **Speicherdauer** | Bis Bearbeitung / Löschung |
| **DSFA erforderlich** | Nein — siehe `docs/DSFA-Pruefung.md` |

---

## 7. Selbst gehostete JavaScript-Bibliothek

| Feld | Inhalt |
|------|--------|
| **Zweck** | Bereitstellung des Supabase-Clients ohne externes CDN |
| **Daten** | Keine zusätzliche Speicherung (Datei von kiezquiz.de) |
| **Rechtsgrundlage** | — (keine Übermittlung an Dritte) |
| **Empfänger** | Keine |
| **Hinweis** | Früher jsDelivr — seit 10.06.2026 self-hosted unter `/assets/js/` |
| **DSFA erforderlich** | Nein — siehe `docs/DSFA-Pruefung.md` |

---

## 8. E-Mail-Benachrichtigungen (Nutzungsbedingungen)

| Feld | Inhalt |
|------|--------|
| **Zweck** | Information über wesentliche NB-Änderungen |
| **Daten** | E-Mail-Adresse registrierter Nutzer |
| **Rechtsgrundlage** | Art. 6 Abs. 1 lit. b DSGVO |
| **Empfänger** | Resend.com (Versand), Supabase Edge Function |
| **AVV/DPA** | Resend DPA abgeschlossen (10.06.2026) |
| **Speicherdauer** | Bis Account-Löschung |
| **DSFA erforderlich** | Nein — siehe `docs/DSFA-Pruefung.md` |

---

## 9. Spielaktivitäts-Protokoll

| Feld | Inhalt |
|------|--------|
| **Zweck** | Auswertung Spielvolumen, Stabilität (Admin) |
| **Betroffene** | Registrierte Nutzer |
| **Daten** | user_id, Stadt, Modus, Treffer, Dauer, Zeitstempel |
| **Rechtsgrundlage** | Art. 6 Abs. 1 lit. f DSGVO |
| **Empfänger** | Supabase EU |
| **Speicherdauer** | Bis Account-Löschung |
| **DSFA erforderlich** | Nein — siehe `docs/DSFA-Pruefung.md` |

---

## 10. Telegram-Entwickler-Bot (intern)

| Feld | Inhalt |
|------|--------|
| **Zweck** | Interne Code-Weiterentwicklung durch Betreiber |
| **Betroffene** | Nur Betreiber (keine Endnutzer) |
| **Daten** | Telegram-Nachrichten des Betreibers |
| **Rechtsgrundlage** | Art. 6 Abs. 1 lit. f DSGVO (Betrieb) |
| **Empfänger** | Telegram FZ-LLC — keine KiezQuiz-Nutzerdaten |
| **AVV** | Nicht erforderlich solange keine Endnutzer-Daten übermittelt werden |
| **DSFA erforderlich** | Nein — siehe `docs/DSFA-Pruefung.md` |

---

*Letzte Aktualisierung: 10. Juni 2026*
