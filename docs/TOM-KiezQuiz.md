# Technische und Organisatorische Maßnahmen (TOMs)

**Verantwortlicher:** Jeremiah J. Lauer  
**Stand:** 10. Juni 2026  
**Bezug:** Art. 32 DSGVO — Schutz personenbezogener Daten durch geeignete Maßnahmen

> **Was ist das?** TOMs sind dein „Sicherheits-Fahrplan“: Welche technischen und organisatorischen Schutzmaßnahmen setzt du ein, damit Nutzerdaten nicht verloren gehen, gestohlen oder missbraucht werden? Die Datenschutzbehörde kann bei einer Prüfung danach fragen — zusammen mit dem VVT (Verzeichnis der Verarbeitungstätigkeiten).

---

## 1. Vertraulichkeit

| Maßnahme | Umsetzung bei KiezQuiz | Status |
|----------|------------------------|--------|
| Transportverschlüsselung | HTTPS/TLS für kiezquiz.de (GitHub Pages erzwingt HTTPS) | ✅ |
| Content Security Policy (CSP) | Meta-Tag in `index.html` (10.06.2026): `default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; connect-src 'self' https://iuixaesbzftgmnmelcad.supabase.co wss://iuixaesbzftgmnmelcad.supabase.co; img-src 'self' data: blob:; font-src 'self'; media-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self';` — `unsafe-inline` für Theme-Bootstrap und JSON-LD | ✅ |
| Passwortspeicherung | Supabase Auth: bcrypt/scrypt, kein Klartext | ✅ |
| Zugriffskontrolle Datenbank | Row Level Security (RLS) auf allen 9 Tabellen; RPC-only für sensible Tabellen | ✅ |
| Kein externes CDN für Client-Libs | Supabase-JS self-hosted (`/assets/js/supabase-2.49.8.min.js`) | ✅ |
| Kein Google Fonts | Schriften lokal unter `/assets/fonts/` | ✅ |
| Admin-Zugänge | 2FA auf GitHub + Supabase Dashboard | ✅ |
| API-Schlüssel | Service-Role-Key nur lokal/CI-Secrets, nie im Repo | ✅ |
| Leaked-Password-Check | Supabase Auth → HaveIBeenPwned (nur Pro Tier) | ⛔ bewusst nicht — Free-Tier-Projekt; Mindestlänge 8 Zeichen stattdessen |
| E-Mail-Bestätigung | Supabase Auth: Confirm email bei Registrierung aktiv | ✅ (Produktion, seit 10.06.2026) |

---

## 2. Integrität

| Maßnahme | Umsetzung | Status |
|----------|-----------|--------|
| RLS-Policies | `profiles`/`game_saves`: nur eigene Daten; `city_wish_requests`: nur Admin-Select | ✅ |
| RPC-only Tabellen | `friend_requests`, `user_city_best_scores`, `player_game_log`, Rate-Limits: RLS + REVOKE | ✅ |
| Input-Validierung | RPCs prüfen auth.uid(), Stadt-IDs, Cooldowns | ✅ |
| Account-Löschung | `delete_my_account()` löscht auth.users → CASCADE auf alle Tabellen | ✅ (regelmäßig testen) |

---

## 3. Verfügbarkeit & Belastbarkeit

| Maßnahme | Umsetzung | Status |
|----------|-----------|--------|
| Hosting | GitHub Pages (statisch, CDN von GitHub/Microsoft) | ✅ |
| Datenbank | Supabase EU (Irland, eu-west-1) | ✅ |
| Backups DB | Supabase Free Tier: keine automatischen PITR-Backups | ⚠️ Free Tier |
| Ausgleich Free Tier | Monatlicher SQL-Export via `scripts/export_supabase_backup.py` + GitHub Action | ✅ |
| Incident-Response | Meldung an HmbBfDI innerhalb 72 h bei Datenpanne (Art. 33 DSGVO) | 📋 Prozess dokumentiert |

---

## 4. Verfahren zur regelmäßigen Überprüfung

| Maßnahme | Umsetzung | Status |
|----------|-----------|--------|
| Supabase Security Advisor | Regelmäßig im Dashboard prüfen | 📋 Quartalsweise |
| Abhängigkeiten | Supabase-JS versioniert und self-hosted | ✅ |
| Rechtstexte | `legalConfig.js` + Locale-Dateien, Stand 10.06.2026 | ✅ |
| NB-Änderungsprozess | `docs/TERMS-CHANGE-PROCESS.md` + 30-Tage-Frist | ✅ |

---

## 5. Organisatorische Maßnahmen

| Maßnahme | Umsetzung | Status |
|----------|-----------|--------|
| Verantwortlicher benannt | Jeremiah J. Lauer, info@kiezquiz.de | ✅ |
| VVT geführt | `docs/VVT-KiezQuiz.md` | ✅ |
| AVV Supabase | DPA akzeptiert (10.06.2026) | ✅ |
| AVV GitHub/Microsoft | DPA archiviert (10.06.2026) | ✅ |
| AVV iCloud Mail | Apple Terms dokumentiert (16.06.2026) | ✅ |
| Löschkonzept | Account-Löschung in App; Gast-Daten nur localStorage | ✅ |
| Mindestalter | 16 Jahre — Checkbox bei Registrierung + DSE/NB | ✅ |
| Barrierefreiheitserklärung | `/barrierefreiheit/` | ✅ |
| Rechts-Fallback ohne JS | `scripts/generate_legal_static.py` im Deploy | ✅ |

---

## 6. Empfohlene nächste Schritte (optional)

1. **Backup prüfen:** monatlich GitHub Action „Supabase monthly backup“ + E-Mail-Erinnerung am 2. — Artifact archivieren — siehe `docs/BACKUP-SUPABASE.md`
2. **Account-Löschung testen:** Testaccount anlegen, spielen, löschen, in Table Editor prüfen ob alle Zeilen weg sind
3. **HSTS-Header:** Bei Migration zu Cloudflare Pages oder Netlify (siehe `docs/SEO-SETUP.md`)

> **Leaked Password Protection** (HaveIBeenPwned) ist bei Supabase nur im Pro Tier verfügbar. Für das kostenlose KiezQuiz bewusst nicht genutzt; Ausgleich: Passwort-Mindestlänge 8 Zeichen in der App.

---

*Archivieren zusammen mit VVT und DPA-PDFs im Ordner „Rechtsdokumente“.*
