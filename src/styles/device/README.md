# Geräte-Layouts (Handy · Tablet · Computer)

KiezQuiz nutzt **eine HTML-Seite** und **getrennte CSS-Dateien** pro Geräteklasse. So kannst du Layouts unabhängig voneinander anpassen, ohne drei verschiedene Webseiten zu pflegen.

## Breakpoints (einheitlich)

| Gerät | Datei | CSS-Bedingung |
|--------|--------|----------------|
| **Computer** | `desktop.css` | `min-width: 1025px` |
| **Tablet** | `tablet.css` | `768px` – `1024px` |
| **Handy** | `phone.css` | `max-width: 767px` |
| **Touch** | `touch.css` | `(hover: none) and (pointer: coarse)` — zusätzlich zur Breite (Wischen, kein Hover) |

**Merken:** Der Browser misst die **Fensterbreite**, nicht „iPhone“ oder „iPad“. Ein schmales Fenster auf dem PC nutzt die Handy-Regeln.

## Was du wo änderst

- **Nur Desktop:** `desktop.css`
- **Nur Tablet:** `tablet.css`
- **Nur Handy:** `phone.css` (inkl. kleinerer Stufen wie `640px` am Ende der Datei)
- **Nur Touch-Verhalten:** `touch.css`

Nicht in `base.css`, `redesign.css` oder `hub.css` neue `@media (max-width: …)` für Layout einbauen — dort steht ein Verweis, die Regeln gehören in `device/`.

## Einbindung im HTML

Nach `redesign.css`:

```html
<link rel="stylesheet" href="src/styles/device/desktop.css">
<link rel="stylesheet" href="src/styles/device/tablet.css">
<link rel="stylesheet" href="src/styles/device/phone.css">
<link rel="stylesheet" href="src/styles/device/touch.css">
```

Stadtseiten: Head kommt aus `hamburg/index.html` (wird beim Deploy von `generate_seo_pages.py` kopiert).

`mobile.css` ist nur noch ein **Kompatibilitäts-Shim** (`@import`); neu verlinken immer die vier `device/`-Dateien.

## Lokal testen

1. Seite öffnen (z. B. `/hamburg/`).
2. DevTools → Responsive Modus oder Fensterbreite ziehen:
   - **&lt; 768 px** → Handy
   - **768–1024 px** → Tablet
   - **≥ 1025 px** → Computer

## Migration / Neuaufbau

Die alte monolithische `mobile.css` liegt als Backup in `src/styles/mobile.css.source`.

Alle Device-Dateien aus Quellen neu erzeugen (selten nötig):

```bash
python3 scripts/build_device_layouts.py
```

## Noch woanders

- **Profil / About / Admin:** teils eigene `@media` in `profile.css`, `about.css`, `admin.css` — bei Bedarf später ebenfalls nach `device/` ziehen.
- **Großes CSS-Release live:** `DESIGN_REVISION` in `scripts/stamp_build.py` erhöhen (Cache-Busting).
