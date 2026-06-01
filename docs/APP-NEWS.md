# App-News („Was ist neu“) — Checkliste für Releases

Diese Anleitung gilt für **Agenten und Maintainer**, die ein Update mit einer einmaligen News-Meldung veröffentlichen wollen.

## Verhalten (Kurzfassung)

- Es gibt **eine** globale News-Meldung (kein Stadt-Onboarding mehr).
- Sie erscheint **pro Nutzer genau einmal pro `APP_NEWS_VERSION`** — beim ersten App-Start nach dem Release, wenn die Version noch nicht bestätigt wurde.
- Nach Klick auf den Bestätigungs-Button wird `global.newsVersionSeen` gespeichert; die Meldung kommt **für diese Version nie wieder**.
- Bei `APP_NEWS_VERSION = 0` oder leerem `appNews.title` wird **nichts** angezeigt.
- Mit Cloud-Sync gilt „gesehen“ geräteübergreifend (`newsVersionSeen` = Maximum aus Local + Cloud).

## Checkliste bei einem Release mit News

### 1. Versionsnummer erhöhen

Datei: `src/game/config.js`

```js
const APP_NEWS_VERSION = 1; // vorher 0 — bei jedem News-Release +1
```

- Immer **ganzzahlig** und **monoton steigend** (1, 2, 3, …).
- Niemals verringern oder dieselbe Nummer mit neuem Text wiederverwenden.

### 2. Texte pflegen (Deutsch + Englisch)

Dateien:

- `src/locales/de.json` → Objekt `"appNews"`
- `src/locales/en.json` → Objekt `"appNews"`

Pflichtfelder für eine sichtbare Meldung:

| Schlüssel | Beschreibung |
|-----------|--------------|
| `title` | Überschrift (muss **nicht leer** sein, sonst kein Modal) |
| `intro` | Einleitung (HTML wie `<strong>` erlaubt) |
| `feature1Icon` … `feature3Icon` | Emoji pro Punkt |
| `feature1Title` / `feature1Text` | Bis zu drei Feature-Zeilen |
| `feature2Title` / `feature2Text` | (optional leer lassen, Box bleibt trotzdem sichtbar) |
| `feature3Title` / `feature3Text` | |
| `footerTip` | Optionaler Hinweis unten |
| `dismiss` | Button-Text (z. B. „Verstanden“ / „Got it“) |

### 3. Technik prüfen (optional)

- `_maybeShowAppNews()` läuft nach Hub-Render und nach Stadt-Karten-Init (`KiezQuizGame.js`).
- Speicherfeld: `save.global.newsVersionSeen` (`saveManager.js`, Migration von altem `onboardingVersionSeen` auf Städte-Ebene).
- Cloud-Merge: `src/cloudSync.js` (`Math.max` für `newsVersionSeen`).

Lokaler Smoke-Test:

1. In DevTools `localStorage` → `kiezquiz_save_v2` → `global.newsVersionSeen` auf `0` setzen oder Save löschen.
2. `APP_NEWS_VERSION` und `appNews.title` gesetzt → Modal einmal sichtbar.
3. Button klicken → erneuter Reload → **kein** Modal mehr.

### 4. Deploy

- Änderungen committen, PR nach `main`, merge (siehe üblicher GitHub-/Pages-Workflow des Repos).
- Nutzer mit altem Stand sehen die News beim nächsten Besuch **einmal**; Nutzer, die die alte Stadt-Onboarding-Meldung schon geschlossen hatten, wurden per Migration auf `newsVersionSeen >= 1` gesetzt (kein erneutes „Moin Moin“-Popup bei Version 0).

## Was du **nicht** tun musst

- Keine `onboardingVersion` mehr in `src/data/cities.js` (entfernt).
- Keine separaten Keys `onboarding` / `onboardingBerlin` / `onboardingFrankfurt` — nur noch `appNews`.
- Kein erneutes Anzeigen durch Stadtwechsel; nur globale Version zählt.

## Referenz im Code

| Thema | Datei |
|-------|--------|
| Versionskonstante | `src/game/config.js` → `APP_NEWS_VERSION` |
| Anzeige-Logik | `src/game/KiezQuizGame.js` → `shouldShowAppNews`, `showAppNews`, `_maybeShowAppNews` |
| Persistenz | `src/saveManager.js` → `global.newsVersionSeen`, `migrateNewsSeen` |
| Cloud-Sync | `src/cloudSync.js` → Merge von `newsVersionSeen` |
