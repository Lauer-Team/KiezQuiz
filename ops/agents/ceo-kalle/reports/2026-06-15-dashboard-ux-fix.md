# Report — Dashboard UX (2026-06-15)

**Von:** Kalle (CEO)  
**An:** Jeremiah  
**Betrifft:** Admin AI-Dashboard (`src/ui/adminAiDashboard.js`)

## Was

Drei UX-Anpassungen am Admin-Dashboard:

1. **Zeitleiste unten entfernt** — Fristen standen doppelt (oben „Anstehende Fristen“ im Schreibtisch + unten „Zeitleiste — alle Fristen“).
2. **Organigramm als Baum** — Du → Kalle → 7 Fach-Agenten als Karten im Diagramm (nicht mehr nur „7 Fach-Agenten“-Pille + Liste darunter).
3. **Automationen pro Agent** — Jede Executive-Karte hat jetzt einen Block „Automationen“ mit Cron/Nächster Lauf; die globale Tabelle am Ende entfällt.

## Warum

Weniger Redundanz, klarere Hierarchie, Verantwortlichkeiten auf einen Blick.

## Dateien

- `src/ui/adminAiDashboard.js` — Rendering
- `src/styles/profile.css` — Organigramm-Baum
- `src/locales/de.json`, `en.json` — Org-Hinweistext

## Ergebnis

Nach Deploy/Reload im Profil → Admin → AI-Dashboard sichtbar.
