# KiezQuiz

Gamifizierte Web-App zum spielerischen Lernen der **7 Bezirke** und **104 Stadtteile** Hamburgs – mit Karte, Quiz-Modi, XP, Rängen und Streaks.

**Live:** https://logic3.github.io/KiezQuiz/

## Starten (lokal)

```bash
npm run dev
```

Öffnet einen lokalen Server auf Port 3000 und startet den Browser. Alternativ `index.html` direkt im Browser öffnen (statische App, kein Build nötig).

## Online stellen (kostenlos)

Die App ist reine HTML/CSS/JS – du brauchst nur **statisches Hosting**. Empfehlung: **GitHub Pages** (kostenlos, dauerhaft).

### GitHub Pages (empfohlen)

1. Projekt auf GitHub pushen (z. B. Repository `logic3/KiezQuiz`).
2. Auf GitHub: **Settings → Pages**.
3. **Build and deployment → Source:** „Deploy from a branch“.
4. **Branch:** `main` (oder dein Standard-Branch), **Folder:** `/ (root)`.
5. Speichern. Nach 1–2 Minuten ist die App erreichbar unter:

   `https://<dein-github-name>.github.io/KiezQuiz/`

   Beispiel: `https://logic3.github.io/KiezQuiz/`

6. Diesen Link kannst du per WhatsApp, E-Mail oder QR-Code teilen – funktioniert auf iPhone, iPad und Desktop.

### Weitere kostenlose Alternativen

| Dienst | URL-Muster | Hinweis |
|--------|------------|---------|
| [Cloudflare Pages](https://pages.cloudflare.com/) | `*.pages.dev` | Drag & Drop oder Git-Anbindung |
| [Netlify Drop](https://app.netlify.com/drop) | `*.netlify.app` | Ordner hochziehen, fertig |
| [Vercel](https://vercel.com/) | `*.vercel.app` | Git-Repo verbinden |

Kein Backend nötig. Fortschritt (XP, Streak) liegt im **localStorage** des Browsers – pro Gerät getrennt.

## Auf dem iPhone „wie eine App“

1. Link in **Safari** öffnen (nicht nur in Instagram/WhatsApp-In-App-Browser).
2. **Teilen** → **Zum Home-Bildschirm**.
3. KiezQuiz startet dann im Vollbild (PWA-ähnlich).

## Repository

- **Web-App:** https://github.com/logic3/KiezQuiz
- **Native App (iOS/macOS, Capacitor):** https://github.com/logic3/KiezQuiz-App

Spiel-Logik immer in diesem Repo ändern; danach in `KiezQuiz-App` mit `npm run cap:sync` in die Xcode-App übernehmen.

## Technik

- Vanilla HTML, CSS und JavaScript
- Daten: `src/data/hamburg_stadtteile.json`, Karte eingebettet in `index.html`
- Optional: `python scripts/assemble_html.py` zum Regenerieren der HTML-Vorlage
- Mobil: Safe Areas (Notch), Touch-Pan, Pinch-Zoom, größere Tap-Targets
