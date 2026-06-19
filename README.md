# KiezQuiz ⚓

Gamifizierte Web-App zum spielerischen Lernen von **Stadtgliederungen** — starte in **Hamburg** (7 Bezirke, 104 Stadtteile), **Berlin** (12 Bezirke, 97 Ortsteile) oder **Frankfurt am Main** (16 Ortsbezirke, 46 Stadtteile). Mit interaktiver Karte, Quiz-Modi, XP, Quiddje-Rängen und Streaks.

**Live:** [kiezquiz.de](https://kiezquiz.de) · [kiezquiz.lauer.team](https://kiezquiz.lauer.team) (Weiterleitung)

## Städte

| Stadt | Status |
|-------|--------|
| Hamburg | Spielbar |
| Berlin | Spielbar |
| Frankfurt am Main | Spielbar |

**Global** (über alle Städte): XP, Streak, Quiddje-Rang. **Pro Stadt:** Pokale, Freischaltungen, Karten-Fortschritt.

## Spielmodi

| Modus | Beschreibung |
|-------|--------------|
| Entdecker | Karte frei erkunden, Infos zu Bezirken und Stadtteilen |
| Stadtteil-Detektiv | Gesuchten Ort auf der Karte finden |
| Karten-Quiz | Blinkenden Stadtteil erkennen |
| Namen eingeben | Blinkenden Ort eintippen |
| Nenne alle Orte | Namens-Sprint – Nenne alle Orte gegen die Uhr |

Fortschritt (XP, Streak, freigeschaltete Bezirke) wird **lokal** gespeichert. Optional kannst du dich mit E-Mail anmelden, um den Spielstand **geräteübergreifend in der Cloud** zu sichern — siehe [docs/SUPABASE-SETUP.md](docs/SUPABASE-SETUP.md).

---

## Repositories

Dieses Repo ist die **Quelle für alles Spielrelevante**. Die native iOS/macOS-App ist ein separates Wrapper-Projekt:

| Repo | Inhalt |
|------|--------|
| **[KiezQuiz](https://github.com/Lauer-Team/KiezQuiz)** (dieses Repo) | Web-App — HTML, CSS, JavaScript, Daten |
| **[KiezQuiz-Ops](https://github.com/Lauer-Team/KiezQuiz-Ops)** (privat) | Ops-Team, Leitstand, Telegram-Bot Kalle |
| **[KiezQuiz-App](https://github.com/logic3/KiezQuiz-App)** | Native Hülle — Capacitor, Xcode, iOS/macOS |

---

## Lokal starten

**Supabase (optional):** Für Cloud-Sync die Vorlage kopieren und Keys eintragen:

```bash
cp src/supabaseConfig.example.js src/supabaseConfig.js
# Dann URL und anon Key aus dem Supabase-Dashboard eintragen (siehe docs/SUPABASE-SETUP.md)
```

`src/supabaseConfig.js` ist in `.gitignore` und wird bei GitHub Pages aus Repository-Secrets erzeugt — nicht committen.

```bash
npm run dev
```

Startet einen lokalen Server auf Port 3000 und öffnet den Browser. Alternativ `index.html` direkt öffnen — kein Build-Schritt nötig.

---

## Entwicklung: Web-App und native App

**Spiel-Logik, Karte, Design → immer hier ändern.** Die Capacitor-App packt diese Dateien nur in ein natives Fenster (WKWebView).

### Was wo hingehört

| Änderung | Repo | Danach |
|----------|------|--------|
| Quiz, Karte, Sounds, CSS, XP | **KiezQuiz** (hier) | siehe Sync unten |
| App-Icon, Splash, Signing, Bundle ID | [KiezQuiz-App](https://github.com/logic3/KiezQuiz-App) / Xcode | — |
| Capacitor-Einstellungen (Scroll, Statusleiste) | KiezQuiz-App | — |

Nicht manuell editieren in KiezQuiz-App: `www/` und `ios/App/App/public/` — werden beim Sync überschrieben.

### Workflow nach Web-Änderungen

Beide Repos lokal **nebeneinander** klonen:

```
…/KiezQuiz/       ← dieses Repo
…/KiezQuiz-App/   ← natives Repo
```

```bash
# 1. Web-App ändern und committen
cd KiezQuiz
git add -A && git commit -m "…" && git push

# 2. In native App übernehmen
cd ../KiezQuiz-App
npm run cap:sync

# 3. In Xcode testen (⇧⌘K, dann ⌘R)
npm run cap:open:ios
```

Ausführliche Xcode-Anleitung: [KiezQuiz-App/SETUP.md](https://github.com/logic3/KiezQuiz-App/blob/main/SETUP.md)

---

## Nutzung ohne native App

### Im Browser

Link teilen oder lokal mit `npm run dev` — funktioniert auf Mac, iPhone, iPad und Desktop.

### Auf dem iPhone „wie eine App“

1. Link in **Safari** öffnen (nicht im In-App-Browser von WhatsApp/Instagram).
2. **Teilen** → **Zum Home-Bildschirm**.
3. KiezQuiz startet im Vollbild (PWA-ähnlich).

---

## Projektstruktur

```
KiezQuiz/
├── index.html              # Einstieg, eingebettete SVG-Karte
├── manifest.webmanifest    # PWA-Manifest
├── src/
│   ├── app.js              # Spiel-Logik
│   ├── auth.js             # Supabase Auth (optional)
│   ├── cloudSync.js        # Cloud-Spielstand-Sync
│   ├── supabaseConfig.example.js  # Vorlage für lokale Keys
│   ├── supabaseConfig.js   # Lokal / CI-generiert (nicht in Git)
│   ├── style.css           # Layout & Design
│   └── data/               # Bezirke, Stadtteile, Karte
├── docs/
│   └── SUPABASE-SETUP.md   # Supabase Schritt-für-Schritt-Anleitung
├── icons/
└── scripts/
    └── assemble_html.py    # Optional: index.html aus Vorlage regenerieren
```

---

## Technik

- Vanilla HTML, CSS und JavaScript — kein Framework, kein Build
- Statisches Hosting (GitHub Pages)
- Web Audio API für Soundeffekte
- `localStorage` für Spielstand; optional Supabase Cloud-Sync ([Setup-Anleitung](docs/SUPABASE-SETUP.md))
- Mobil: Safe Areas, Touch-Pan, Pinch-Zoom, größere Tap-Targets

---

## Datenschutz

**Ohne Account:** Der Spielstand wird ausschließlich lokal im Browser bzw. in der App gespeichert — keine Übertragung an Server.

**Mit optionalem Account:** E-Mail, Benutzername und Spielstand werden verschlüsselt über TLS bei [Supabase](https://supabase.com) (Region EU) gespeichert. Keine Weitergabe an Dritte. Einrichtung: [docs/SUPABASE-SETUP.md](docs/SUPABASE-SETUP.md).

---

## Lizenz & Credit

Courtesy of Jeremiah J. Lauer, LL.M.
