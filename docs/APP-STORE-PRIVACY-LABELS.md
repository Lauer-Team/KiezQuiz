# App Store Connect – Privacy Labels Checkliste (KiezQuiz-App)

**Stand:** 10. Juni 2026  
**Repo:** KiezQuiz-App (Capacitor, separates Repository)  
**Referenz:** Apple App Store Review Guidelines § 5; `PrivacyInfo.xcprivacy` (iOS 17+)

---

## App Store Connect – Data Types

| Data Type | Collected? | Linked to User | Used for Tracking | Purpose |
|-----------|------------|----------------|-------------------|---------|
| Email Address | Ja (optional, Account) | Ja | Nein | App Functionality |
| User ID | Ja (Supabase UUID) | Ja | Nein | App Functionality |
| Product Interaction | Ja (Spielstand, Modi, Punkte) | Ja | Nein | App Functionality |
| Other User Content | Ja (Benutzername, Freundesliste) | Ja | Nein | App Functionality |
| Crash Data | Nein (kein Crashlytics) | — | — | — |
| Device ID | Nein | — | — | — |
| Location | Nein | — | — | — |

**Tracking:** Nein (NSPrivacyTracking = false)

---

## PrivacyInfo.xcprivacy (im KiezQuiz-App-Repo anlegen)

Datei neben `Info.plist` im Xcode-Projekt-Root erstellen:

- `NSPrivacyTracking`: `false`
- `NSPrivacyCollectedDataTypes`: Email Address (linked, not tracking, purpose: App Functionality)
- `NSPrivacyAccessedAPITypes`: `NSPrivacyAccessedAPICategoryFileTimestamp` mit Reason `C617.1` (falls Capacitor/WKWebView Datei-Zeitstempel nutzt)

Vollständiges XML-Template: siehe Legora-Checkliste KIE-39 / Cursor-Prompt.

---

## Manuelle Schritte (Betreiber)

1. [ ] `PrivacyInfo.xcprivacy` im KiezQuiz-App-Repo committen
2. [ ] App Store Connect → App Privacy → Felder wie obige Tabelle ausfüllen
3. [ ] DSE auf kiezquiz.de Abschnitt 16 (App Store) veröffentlichen — erledigt im Haupt-Repo
4. [ ] App Store Review Guidelines § 5.1.1 und § 5.1.2 gegenprüfen

---

*Internes Dokument — Checkliste für App Store Connect.*
