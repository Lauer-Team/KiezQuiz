# Changelog

All notable changes to KiezQuiz. The in-app “Was ist neu?” view shows the same history (newest first).

## [1.3.0] — 2026-06-01

### Added
- Quick-pick bar for small European countries (Luxembourg, Malta, Andorra, Monaco, San Marino, Liechtenstein, Vatican City)
- Enlarged tap circles on the Europe map for hard-to-reach countries
- Auto-zoom to microstates in Locate and Quiz modes

### Changed
- Sharp focus zoom via SVG viewBox instead of blurry CSS scaling

### Fixed
- Tap circles on small countries now respond to clicks in all game modes

## [1.2.0] — 2026-06-01

### Added
- “Was ist neu?” changelog with full version history, reachable from footer and settings

## [1.1.0] — 2026-06-01

### Added
- Europe map quiz with 44 countries and capitals as fourth game world
- Explorer mode and open capitals mode for Europe

### Fixed
- Trophy alerts and default all countries in capitals mode

## [1.0.0] — 2026-06-01

### Added
- One-time app news modal for major updates
- Profile page with friends, leaderboards, and per-city best scores

### Changed
- Tappable trophies in the log modal
- Map auto-zoom fits active borough edge-to-edge

### Fixed
- Profile UX for account actions, history, search, and leaderboards
- Friend search: multiple requests work, case does not matter

## [0.9.0] — 2026-06-01

### Added
- SEO foundation (structured data, landing pages)
- Admin area for city wish analytics
- 23-hour cooldown per city wish with clear feedback

### Changed
- Smaller HTML and lazy game loading for faster start
- City URLs start directly in the playable app

### Fixed
- App startup blocked by hanging Supabase auth
- Deep-link city mismatch and header badge on city switch

## [0.8.0] — 2026-06-01

### Added
- Frankfurt am Main as third playable city
- City wish list: vote for or propose the next city

### Fixed
- City segment counts, map panning, and wish tracking
- Stacked settings modals when switching cities

## [0.7.0] — 2026-06-01

### Added
- Berlin as second playable city with boroughs and neighbourhoods
- City-aware engine: maps, trophies, and trivia per city

### Fixed
- Berlin playability, onboarding, map labels, and island puzzle UI
- Sharper borough boundary lines

## [0.6.0] — 2026-06-01

### Added
- Multi-city hub with separate progress per city
- Global XP ranks split from per-city borough and trophy ranks

### Fixed
- Cloud merge race on boot for logged-in users

## [0.5.0] — 2026-05-31

### Added
- English language support with DE/EN switcher
- Primary domain kiezquiz.de

## [0.4.0] — 2026-05-31

### Added
- Optional Supabase auth and cloud progress sync
- Open Graph and Twitter Card meta tags for link previews
- Dependabot for GitHub Actions and npm

### Fixed
- Auth UX and cloud save reliability on logout

### Security
- Stop committing Supabase keys; harden auth RPC

## [0.3.0] — 2026-05-29

### Changed
- Rebrand project to KiezQuiz
- Prepared for GitHub Pages and mobile Safari
- Selection sounds and mobile map gesture hint
- Log and settings modals close on backdrop tap; footer credit

### Fixed
- Map click vs. drag on native Mac
- Neuwerk island badge polish

## [0.2.0] — 2026-05-28

### Added
- Trophy system and 10-minute round timer
- Multi-borough rounds and improved start flow

### Changed
- Map water styling, borough boundaries, progression, and feedback
- Slower rank progression; stats bar and log copy polish

### Fixed
- Map tooltips, game modes, audio, and UI polish
- Overlay scroll lock

## [0.1.0] — 2026-05-28

### Added
- Initial release: interactive Hamburg map (7 boroughs, 104 districts)
- Game modes: Explorer, Locate, Quiz, Type Name, Name All
- XP, ranks, streaks, game history, and Web Audio sounds

Test Telegram-Agent (wird nicht deployed).
