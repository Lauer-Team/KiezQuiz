import os

def main():
    print("Starting HTML assembly...")
    
    # 1. Read SVG contents
    svg_path = "src/data/hamburg_map.svg"
    if not os.path.exists(svg_path):
        print(f"Error: {svg_path} does not exist!")
        return
        
    with open(svg_path, "r", encoding="utf-8") as f:
        svg_content = f.read()

    # 2. Append toggle switch and segment styling to style.css for UI toggle support
    css_path = "src/style.css"
    additional_css = """
/* Slider Switch CSS */
.switch {
  position: relative;
  display: inline-block;
  width: 44px;
  height: 24px;
}
.switch input {
  opacity: 0;
  width: 0;
  height: 0;
}
.slider {
  position: absolute;
  cursor: pointer;
  top: 0; left: 0; right: 0; bottom: 0;
  background-color: rgba(255, 255, 255, 0.08);
  border: 1px solid var(--border-color);
  transition: 0.3s;
  border-radius: 34px;
}
.slider:before {
  position: absolute;
  content: "";
  height: 16px;
  width: 16px;
  left: 3px;
  bottom: 3px;
  background-color: var(--text-secondary);
  transition: 0.3s;
  border-radius: 50%;
}
.switch input:checked + .slider {
  background-color: rgba(0, 162, 255, 0.15);
  border-color: rgba(0, 162, 255, 0.4);
}
.switch input:checked + .slider:before {
  transform: translateX(20px);
  background-color: var(--color-neutral-glow);
  box-shadow: 0 0 8px var(--color-neutral-glow);
}

/* Segment selector style */
.segment-selector {
  display: flex;
  background: var(--bg-surface);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  padding: 0.35rem;
  gap: 0.3rem;
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
}
.segment-btn {
  flex: 1;
  background: transparent;
  border: none;
  color: var(--text-secondary);
  font-family: var(--font-sans);
  font-weight: 700;
  font-size: 0.85rem;
  padding: 0.5rem;
  border-radius: var(--radius-sm);
  cursor: pointer;
  transition: var(--transition-fast);
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 0.4rem;
}
.segment-btn:hover {
  color: var(--text-primary);
  background: rgba(255, 255, 255, 0.04);
}
.segment-btn.active {
  background: rgba(0, 162, 255, 0.15);
  color: #fff;
  border: 1px solid rgba(0, 162, 255, 0.3);
  box-shadow: inset 0 0 10px rgba(0, 162, 255, 0.1);
}

/* Autocomplete styling */
.autocomplete-container {
  position: relative;
  width: 100%;
}
.autocomplete-dropdown {
  position: absolute;
  bottom: 100%;
  left: 0;
  right: 0;
  background: rgba(10, 15, 30, 0.95);
  border: 1px solid var(--border-color-glow);
  border-radius: var(--radius-md);
  max-height: 180px;
  overflow-y: auto;
  z-index: 1000;
  box-shadow: 0 -4px 20px rgba(0, 0, 0, 0.6);
  margin-bottom: 5px;
  display: none;
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
}
.autocomplete-item {
  padding: 0.6rem 1rem;
  font-size: 0.9rem;
  color: var(--text-secondary);
  cursor: pointer;
  text-align: left;
  border-bottom: 1px solid rgba(255, 255, 255, 0.03);
  transition: var(--transition-fast);
}
.autocomplete-item:hover, .autocomplete-item.active {
  background: rgba(0, 162, 255, 0.15);
  color: #fff;
}

/* Round / Sporcle Active Styles */
.round-progress-bar {
  width: 100%;
  height: 6px;
  background: rgba(255,255,255,0.05);
  border-radius: 999px;
  overflow: hidden;
  margin: 0.5rem 0;
}
.round-progress-fill {
  height: 100%;
  width: 0%;
  background: var(--color-neutral-glow);
  border-radius: 999px;
  transition: width 0.3s ease;
}

.text-input-field {
  width: 100%;
  background: rgba(0, 0, 0, 0.3);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  padding: 0.85rem 1rem;
  color: #fff;
  font-family: var(--font-sans);
  font-size: 1rem;
  transition: var(--transition-fast);
  outline: none;
}
.text-input-field:focus {
  border-color: rgba(0, 162, 255, 0.5);
  box-shadow: 0 0 10px rgba(0, 162, 255, 0.2);
  background: rgba(0, 0, 0, 0.4);
}

.timer-display {
  font-family: var(--font-display);
  font-size: 2.2rem;
  font-weight: 700;
  color: var(--color-incorrect);
  text-shadow: 0 0 15px rgba(239, 68, 68, 0.3);
  text-align: center;
  margin: 0.5rem 0;
  letter-spacing: 0.05em;
}

/* Found names container */
.found-names-container {
  margin-top: 1rem;
  background: rgba(0,0,0,0.2);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  padding: 0.8rem;
  max-height: 150px;
  overflow-y: auto;
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
}
.found-name-tag {
  background: rgba(20, 184, 166, 0.1);
  border: 1px solid rgba(20, 184, 166, 0.3);
  color: #fff;
  font-size: 0.75rem;
  font-weight: 600;
  padding: 0.2rem 0.5rem;
  border-radius: var(--radius-sm);
  animation: scaleIn 0.2s cubic-bezier(0.34, 1.56, 0.64, 1);
}

/* Continuous round highlights on map */
.stadtteil-path.round-correct {
  fill: hsla(142, 76%, 45%, 0.25) !important;
  stroke: var(--color-correct) !important;
  stroke-width: 1.5px !important;
}
.stadtteil-path.round-incorrect {
  fill: hsla(350, 89%, 60%, 0.25) !important;
  stroke: var(--color-incorrect) !important;
  stroke-width: 1.5px !important;
}

/* Floating label styling inside SVG */
.map-text-label {
  fill: #fff;
  font-family: var(--font-sans);
  font-size: 6.5px;
  font-weight: 700;
  text-shadow: 0 0 4px #000, 0 0 2px #000;
  pointer-events: none;
  alignment-baseline: middle;
  text-anchor: middle;
  opacity: 0.95;
  animation: fadeIn 0.4s ease-out;
}
"""
    if os.path.exists(css_path):
        with open(css_path, "r", encoding="utf-8") as f:
            css_content = f.read()
        if "Slider Switch CSS" not in css_content:
            with open(css_path, "a", encoding="utf-8") as f:
                f.write(additional_css)
            print("Successfully appended game engine styles to src/style.css!")

    # 3. Extract path contents to embed the water group inside the SVG
    import re
    # Match the inner group content from generated SVG
    group_match = re.search(r"<g class=\"stadtteile-group\">(.*?)</g>", svg_content, re.DOTALL)
    if not group_match:
        print("Error: Could not extract stadtteile-group from SVG!")
        return
        
    joined_paths = group_match.group(1).strip()
    
    # Bounding box values
    bbox_match = re.search(r"viewBox=\"0 0 (\d+) (\d+)\"", svg_content)
    width = bbox_match.group(1) if bbox_match else "615"
    height = bbox_match.group(2) if bbox_match else "600"

    water_defs = '''<defs>
    <linearGradient id="water-body-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="hsl(215, 38%, 16%)"/>
      <stop offset="50%" stop-color="hsl(205, 42%, 20%)"/>
      <stop offset="100%" stop-color="hsl(225, 32%, 12%)"/>
    </linearGradient>
    <radialGradient id="water-shimmer-gradient" cx="40%" cy="35%" r="60%">
      <stop offset="0%" stop-color="rgba(0, 180, 255, 0.18)"/>
      <stop offset="100%" stop-color="rgba(0, 100, 180, 0)"/>
    </radialGradient>
    <linearGradient id="water-channel-gradient" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="hsla(200, 55%, 42%, 0.32)"/>
      <stop offset="100%" stop-color="hsla(220, 45%, 28%, 0.42)"/>
    </linearGradient>
  </defs>'''

    water_group = '''<g class="water-group">
    <path class="water-body" d="M -25,378 L 42,365 L 88,358 L 142,352 L 188,346 L 232,342 L 278,339 L 328,340 L 378,344 L 430,348 L 485,352 L 545,354 L 650,358 L 650,372 L 545,368 L 485,366 L 430,362 L 378,358 L 328,354 L 278,353 L 232,356 L 188,362 L 142,368 L 88,374 L 42,381 L -25,392 Z" />
    <path class="water-outline" d="M -25,378 L 42,365 L 88,358 L 142,352 L 188,346 L 232,342 L 278,339 L 328,340 L 378,344 L 430,348 L 485,352 L 545,354 L 650,358" />
    <path class="water-body" d="M 188,346 L 198,362 L 218,382 L 248,402 L 288,418 L 338,428 L 398,432 L 468,424 L 540,412 L 620,398 L 650,392 L 650,408 L 620,414 L 540,428 L 468,440 L 398,448 L 338,444 L 288,434 L 248,418 L 218,398 L 198,378 L 188,362 Z" />
    <path class="water-outline" d="M 188,346 L 198,362 L 218,382 L 248,402 L 288,418 L 338,428 L 398,432 L 468,424 L 540,412 L 620,398 L 650,392" />
    <path class="water-body" d="M 251,279 L 261,273 L 272,272 L 282,275 L 291,281 L 297,290 L 299,302 L 297,312 L 291,320 L 282,325 L 271,326 L 261,323 L 254,316 L 250,305 L 249,293 L 251,279 Z" />
    <path class="water-outline" d="M 251,279 L 261,273 L 272,272 L 282,275 L 291,281 L 297,290 L 299,302 L 297,312 L 291,320 L 282,325 L 271,326 L 261,323 L 254,316 L 250,305 L 249,293 Z" />
    <path class="water-body" d="M 261,311 L 270,309 L 277,312 L 279,318 L 275,323 L 268,325 L 262,322 L 260,316 L 261,311 Z" />
    <path class="water-outline" d="M 261,311 L 270,309 L 277,312 L 279,318 L 275,323 L 268,325 L 262,322 L 260,316 Z" />
    <path class="water-body" d="M 279,318 L 282,325 L 278,332 L 272,336 L 266,334 L 268,328 L 274,322 L 279,318 Z" />
  </g>'''

    # Complete SVG embedding (water below districts)
    svg_inlined = f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {width} {height}" class="hamburg-map-svg">
  {water_defs}
  {water_group}
  <g class="stadtteile-group">
    {joined_paths}
  </g>
  <g id="map-labels-group" style="pointer-events: none;"></g>
</svg>'''

    # 4. Create index.html template and inject SVG
    html_content = f'''<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">
  <title>KiezQuiz – Stadtteile spielerisch lernen</title>
  <meta name="description" content="KiezQuiz: Lerne spielerisch alle 7 Bezirke und 104 Stadtteile Hamburgs – interaktiv, offline spielbar und mobiloptimiert.">
  <meta name="theme-color" content="#0f1118">
  <meta name="apple-mobile-web-app-capable" content="yes">
  <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
  <meta name="apple-mobile-web-app-title" content="KiezQuiz">
  <meta name="format-detection" content="telephone=no">

  <!-- Link-Vorschau: Open Graph (WhatsApp, Signal, Telegram, Facebook, …) -->
  <!-- DOMAIN: Alle https://kiezquiz.lauer.team-URLs unten anpassen, z. B. https://logic3.github.io/KiezQuiz -->
  <meta property="og:type" content="website">
  <meta property="og:site_name" content="KiezQuiz">
  <meta property="og:title" content="KiezQuiz">
  <meta property="og:description" content="Besser wissen als Besserwissen">
  <meta property="og:url" content="https://kiezquiz.lauer.team/">
  <meta property="og:locale" content="de_DE">
  <meta property="og:image" content="https://kiezquiz.lauer.team/assets/og-image.jpg">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">
  <meta property="og:image:type" content="image/jpeg">

  <!-- Link-Vorschau: Twitter / X Card -->
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="KiezQuiz">
  <meta name="twitter:description" content="Besser wissen als Besserwissen">
  <meta name="twitter:image" content="https://kiezquiz.lauer.team/assets/og-image.jpg">

  <link rel="manifest" href="manifest.webmanifest">
  <link rel="icon" href="icons/icon.svg" type="image/svg+xml">
  <link rel="apple-touch-icon" href="icons/icon.svg">
  <link rel="stylesheet" href="src/style.css">
</head>
<body>

  <div class="app-container">
    
    <!-- App Header & Stats Bar -->
    <header class="app-header">
      <div class="brand">
        <h1>KiezQuiz ⚓</h1>
        <span class="badge">Gamified Learning</span>
      </div>
      
      <div class="stats-bar">
        <!-- Streak Pill -->
        <div class="stat-pill streak-pill" title="Deine aktuelle Antwortserie">
          <div class="streak-info">
            <div class="streak-current">
              <span class="label">Serie 🔥:</span>
              <span class="value" id="stat-streak">0x</span>
            </div>
            <div class="streak-best" id="stat-best-streak">Beste: 0x</div>
          </div>
        </div>

        <!-- XP Pill -->
        <div class="stat-pill xp-pill" title="Deine Erfahrungspunkte">
          <span class="label">XP:</span>
          <span class="value" id="stat-xp">0</span>
        </div>
        
        <!-- Level & Rank tracker -->
        <div class="level-tracker">
          <div class="level-info">
            <span class="rank-name" id="stat-rank">Quiddje</span>
          </div>
          <div class="progress-bg">
            <div class="progress-fill" id="progress-fill"></div>
          </div>
        </div>
        
        <!-- Audio Synthesizer toggle -->
        <button class="audio-toggle" id="btn-mute" title="Sound ein/ausschalten">🔊</button>
        <!-- Game history -->
        <button class="audio-toggle" id="btn-history" title="Spielverlauf">📋</button>
        <!-- Settings -->
        <button class="audio-toggle" id="btn-settings" title="Einstellungen">⚙️</button>
      </div>
    </header>

    <!-- Main Dashboard -->
    <main class="dashboard-grid">
      
      <!-- Left Panel: Gameplay Console -->
      <section class="console-panel">
        
        <!-- Segment selector (Lerne Stadtteile vs Bezirke) -->
        <div class="segment-selector">
          <button class="segment-btn active" id="btn-segment-stadtteile">
            <span>🏙️ Stadtteile</span>
          </button>
          <button class="segment-btn" id="btn-segment-bezirke">
            <span>🏢 Bezirke lernen</span>
          </button>
        </div>

        <!-- Game Mode Selection -->
        <div class="glass-card mode-selector">
          <h3>Spielmodus wählen</h3>
          <div class="modes-list">
            <button class="mode-btn active" data-mode="EXPLORER" id="mode-explorer">
              <span class="mode-icon">🗺️</span>
              <div style="display:flex; flex-direction:column;">
                <span style="font-weight:700;">Entdecker-Modus</span>
                <span style="font-size:0.75rem; font-weight:400; opacity:0.8;">Frei erkunden & Infos lernen</span>
              </div>
            </button>
            <button class="mode-btn" data-mode="LOCATE" id="mode-locate">
              <span class="mode-icon">🕵️</span>
              <div style="display:flex; flex-direction:column;">
                <span style="font-weight:700;">Stadtteil-Detektiv</span>
                <span style="font-size:0.75rem; font-weight:400; opacity:0.8;">Finde den Ort auf der Karte</span>
              </div>
            </button>
            <button class="mode-btn" data-mode="QUIZ" id="mode-quiz">
              <span class="mode-icon">⚡</span>
              <div style="display:flex; flex-direction:column;">
                <span style="font-weight:700;">Karten-Quiz</span>
                <span style="font-size:0.75rem; font-weight:400; opacity:0.8;">Erkenne den blinkenden Ort</span>
              </div>
            </button>
            <button class="mode-btn" data-mode="TYPE_NAME" id="mode-typename">
              <span class="mode-icon">⌨️</span>
              <div style="display:flex; flex-direction:column;">
                <span style="font-weight:700;">Namen eingeben</span>
                <span style="font-size:0.75rem; font-weight:400; opacity:0.8;">Blinkenden Ort eintippen</span>
              </div>
            </button>
            <button class="mode-btn" data-mode="NAME_ALL" id="mode-nameall">
              <span class="mode-icon">⏱️</span>
              <div style="display:flex; flex-direction:column;">
                <span style="font-weight:700;">Nenne alle Orte</span>
                <span style="font-size:0.75rem; font-weight:400; opacity:0.8;">Sporcle-Challenge gegen die Zeit</span>
              </div>
            </button>
          </div>
        </div>

        <!-- Gameplay Interactive Area (Dynamic) -->
        <div class="glass-card game-play-area" id="game-play-area-card">
          <div id="game-play-area">
            <!-- Appended dynamically by app.js -->
          </div>
        </div>

        <!-- Progression & Bezirk Lock Status -->
        <div class="glass-card unlocker-card" id="unlocker-card-container">
          <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid var(--border-color); padding-bottom:0.5rem; margin-bottom:0.5rem;">
            <h3 style="font-family:var(--font-display); font-size:1rem; color:var(--text-secondary); text-transform:uppercase; letter-spacing:0.05em;">Bezirks-Fortschritt</h3>
          </div>
          <div class="district-progress-list" id="district-progress-list">
            <!-- Appended dynamically by app.js -->
          </div>
        </div>

        <!-- Bypass progression Toggle -->
        <div class="glass-card" style="padding: 1rem; display: flex; align-items: center; justify-content: space-between; gap: 1rem;">
          <div style="display: flex; flex-direction: column;">
            <span style="font-weight: 700; font-size: 0.85rem; color: #fff;">Alle Bezirke freischalten</span>
            <span style="font-size: 0.75rem; color: var(--text-secondary);">Bypass für Profis (keine Progression)</span>
          </div>
          <label class="switch">
            <input type="checkbox" id="toggle-progression">
            <span class="slider"></span>
          </label>
        </div>

      </section>

      <!-- Right Panel: Interactive SVG Map -->
      <section class="map-panel">
        
        <!-- Bounding Box for SVG Map -->
        <div class="map-container-wrapper" id="map-wrapper">
          
          <!-- Floating Neuwerk Island Easter Egg -->
          <div class="neuwerk-overlay" id="neuwerk-anchor" title="Wo liegt eigentlich Neuwerk? Klicke hier!">
            <div class="no-badge"></div>
            <span>Neuwerk (Insel-Rätsel) 🏝️</span>
          </div>
          
          <!-- Inlined Map SVG -->
          {svg_inlined}
          
          <!-- Floating Tooltip -->
          <div class="map-tooltip" id="map-tooltip"></div>
          
        </div>

        <!-- Map Navigation Controls -->
        <div class="map-controls">
          <div class="zoom-btns">
            <button class="control-btn" id="btn-zoom-in" title="Vergrößern">+</button>
            <button class="control-btn" id="btn-zoom-out" title="Verkleinern">-</button>
            <button class="control-btn" id="btn-zoom-reset" title="Originalgröße und Zentrierung" style="color: var(--color-neutral-glow); font-weight: 800; border-color: rgba(0, 162, 255, 0.3);">🏠 Zentrieren & Reset</button>
          </div>
          <div class="map-hint" id="map-hint-text">
            💡 Tipp: Ziehe zum Verschieben. Pinch oder Mausrad zum Zoomen.
          </div>
        </div>

      </section>
      
    </main>

    <footer class="app-footer">
      <p class="privacy-notice">
        <strong>Datenschutz:</strong> Keine Server, keine Accounts — dein Spielstand (XP, Streak, Fortschritt) wird nur lokal im Browser gespeichert und nicht an uns übertragen.
      </p>
      <p class="footer-credit">Courtesy of Jeremiah J. Lauer, LL.M.</p>
    </footer>
  </div>

  <!-- Database & Logic Script tags -->
  <script src="src/data/hamburg_data.js"></script>
  <script src="src/app.js"></script>
</body>
</html>
'''
    
    # Save the resulting HTML
    with open("index.html", "w", encoding="utf-8") as f:
        f.write(html_content)
    print("Successfully assembled index.html with inlined map SVG and new gaming selectors!")

if __name__ == "__main__":
    main()
