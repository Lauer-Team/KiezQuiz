# KiezQuiz SEO Setup

Manual steps for search-engine registration and community launch. Code deploys `robots.txt`, `sitemap.xml`, and city landing pages automatically via GitHub Actions.

## Google Search Console

1. Go to [Google Search Console](https://search.google.com/search-console) and add property **https://kiezquiz.de/** (URL-prefix or Domain property).
2. **DNS verification (recommended for domain property):**
   - Choose **Domain** property type and enter `kiezquiz.de`.
   - Add the TXT record Google provides to your DNS host (e.g. Cloudflare, IONOS).
   - Wait for propagation (often minutes, up to 48 h), then click **Verify**.
3. **Alternative — HTML file or meta tag:** If using URL-prefix property, upload the verification file to the site root or add the meta tag to `index.html`, deploy, then verify.
4. **Submit sitemap:** In GSC → **Sitemaps**, enter `https://kiezquiz.de/sitemap.xml` and submit.
5. **Request indexing:** Use **URL Inspection** for key URLs and click **Request indexing**:
   - `https://kiezquiz.de/`
   - `https://kiezquiz.de/hamburg/`
   - `https://kiezquiz.de/berlin/`
   - `https://kiezquiz.de/frankfurt/`

## Bing Webmaster Tools

1. Go to [Bing Webmaster Tools](https://www.bing.com/webmasters) and sign in.
2. **Add site:** Enter `https://kiezquiz.de/` (or import from Google Search Console if already verified there).
3. **DNS verification:** Add the CNAME or TXT record Bing provides at your DNS provider, then verify.
4. **Submit sitemap:** **Sitemaps** → submit `https://kiezquiz.de/sitemap.xml`.
5. **URL submission:** Use **URL Submission** for the same key URLs as above (optional; sitemap usually suffices).

## After deploy checklist

- [x] Confirm `https://kiezquiz.de/robots.txt` is reachable and references the sitemap. (verified 2026-06-01)
- [x] Confirm `https://kiezquiz.de/sitemap.xml` lists all four URLs. (verified 2026-06-01)
- [x] Confirm city pages load: `/hamburg/`, `/berlin/`, `/frankfurt/`. (verified 2026-06-01)
- [x] Homepage: shorter SERP title, `hreflang`, FAQ schema, `<noscript>` fallback (2026-06-01)
- [x] City pages: `twitter:image`, `og:image` dimensions, `og:locale` (generator, 2026-06-01)
- [ ] Test deep links: `https://kiezquiz.de/?city=berlin` opens Berlin in the app (manual in browser).
- [x] Confirm `https://kiezquiz.lauer.team/` redirects to `https://kiezquiz.de/` (301, verified 2026-06-01).
- [ ] Re-run sitemap submission after adding new static pages.

## www-Subdomain (DNS)

Falls `www.kiezquiz.de` in DNS existiert, **301-Weiterleitung** auf `https://kiezquiz.de/` einrichten (Duplicate Content vermeiden):

- **Cloudflare:** Rules → Redirect Rule: `www.kiezquiz.de/*` → `https://kiezquiz.de/$1` (301)
- **IONOS / anderer Host:** Domain-Weiterleitung oder CNAME nur auf Apex, kein paralleles www ohne Redirect

## Bestandsnutzer & Spielstand (Kompatibilität)

Die SEO-Updates ändern **nicht** das Save-Schema:

- Spielstand bleibt unter `localStorage`-Key `kiezquiz_save_v2` (plus Legacy-Keys für Hamburg).
- Wer `https://kiezquiz.de/` ohne URL-Parameter öffnet, landet wie bisher: **Hub** ohne Fortschritt, **letzte Stadt** mit gespeichertem Fortschritt.
- Deep-Links (`/?city=berlin`) öffnen die gewählte Stadt **nur für diese Sitzung**, wenn bereits Fortschritt in einer anderen Stadt besteht — `lastCity` wird dann **nicht** überschrieben.
- Stadt-URLs (`/hamburg/` etc.) laden die **Spiel-App direkt** mit passender Stadt; SEO-Meta, FAQ-Schema und `<noscript>`-Fallback bleiben im `<head>` bzw. für Crawler ohne JS.
- Deep-Links (`/?city=berlin`) funktionieren weiterhin und leiten auf `/` um (Query wird entfernt); Pfad-URLs (`/berlin/`) bleiben in der Adresszeile.
- `src/bootView.js` stellt vor dem ersten Paint die richtige Ansicht wieder her (kein SEO-Text-Flash für Spieler mit Fortschritt).

**Redirect kiezquiz.lauer.team:** GitHub Pages kann nur eine Custom Domain (`CNAME` → `kiezquiz.de`) bedienen. Die Weiterleitung von `kiezquiz.lauer.team` muss beim DNS-Provider als Redirect/301 auf `https://kiezquiz.de/` konfiguriert bleiben.

## Community launch checklist

Use when announcing KiezQuiz publicly. Prepare assets once, then post on launch day.

### Before launch

- [ ] Screenshot or short screen recording of map quiz (Explorer + Quiz mode).
- [ ] One-line pitch: *“Free map quiz — learn all districts of Hamburg, Berlin & Frankfurt. No signup, works offline.”*
- [ ] Link ready: `https://kiezquiz.de/` plus city deep links (`?city=hamburg`, etc.).
- [ ] OG image verified (`/assets/og-image.jpg`) — [Facebook Sharing Debugger](https://developers.facebook.com/tools/debug/?q=https%3A%2F%2Fkiezquiz.de%2F)

### Reddit

- [ ] **r/hamburg**, **r/berlin**, **r/frankfurt** — post as local interest / learning tool; follow each sub’s self-promotion rules; be transparent that you built it.
- [ ] **r/germany**, **r/de** — broader audience; focus on free educational angle, not spam.
- [ ] **r/MapPorn**, **r/geography** — map-learning angle with a screenshot.
- [ ] Reply to comments promptly; avoid duplicate cross-posts the same hour.

### Hacker News

- [ ] **Show HN:** Title e.g. *Show HN: KiezQuiz – Learn Hamburg, Berlin and Frankfurt districts on an interactive map*
- [ ] Post weekday morning US/EU overlap for visibility.
- [ ] First comment: what it is, tech stack (vanilla JS, static GitHub Pages), link, ask for feedback.
- [ ] Monitor thread for bug reports and fix quickly if needed.

### Product Hunt

- [ ] Create maker account; schedule launch (Tuesday–Thursday often perform well).
- [ ] Tagline + description aligned with meta description; gallery: hub, map quiz, trophies.
- [ ] First comment with story and city deep links.
- [ ] Share launch link with friends/network on launch day (not before).

### Post-launch

- [ ] Monitor GSC **Performance** and **Coverage** for crawl errors.
- [ ] Track referrers in analytics (if added later).
- [ ] Collect city wishlist feedback via in-app wish tile.
