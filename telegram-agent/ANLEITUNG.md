# KiezQuiz Telegram-Agent — Einrichtung

> Vom Handy per Telegram Nachrichten schicken → Agent ändert Code → du sagst **ja** → kiezquiz.de ist live.

**Produktion (Stand 2026-06):** Bot läuft auf dem **Hetzner VPS** (`138.199.159.170`, systemd `kiezquiz-agent`). E-Mail über **iCloud** — Details in [`EMAIL.md`](EMAIL.md).

Diese Anleitung beschreibt die lokale Einrichtung (historisch alter Mac; funktioniert auch auf dem VPS analog).

---

## Das brauchst du (einmal)

| Was | Warum |
|-----|-------|
| Alter MacBook (2010) mit **SSD** + **Ubuntu 22.04** | Läuft 24/7 als „Werkstatt“ |
| **8 GB RAM** (besser 16 GB) | Sonst wird der Agent langsam |
| **LAN-Kabel** (wenn möglich) | Stabiler als WLAN |
| **Cursor-Account** (gleicher wie am Laptop) | Für den Agent |
| **GitHub-Zugang** zu `Lauer-Team/KiezQuiz` | Push + Pull Requests |
| **Telegram** auf dem Handy | Deine Fernbedienung |

**Du brauchst NICHT:** Cursor Cloud Agent, My Machines, `-c` / `--cloud` in der CLI.

---

## Die 6 Phasen (Reihenfolge!)

```
Phase A  Alter Mac + Linux
Phase B  Git, GitHub, Cursor CLI
Phase C  Telegram-Bot bei BotFather
Phase D  Bot-Programm auf dem Mac
Phase E  Erster Test
Phase F  Alltag
```

---

## Phase A — Alter Mac vorbereiten (Hardware)

### A1 — SSD (falls noch alte Festplatte drin)

Ohne SSD ist alles quälend langsam. SSD einbauen oder jemanden damit beauftragen.

### A2 — Ubuntu 22.04 installieren

1. Auf einem anderen Rechner: [ubuntu.com/download](https://ubuntu.com/download) → **Ubuntu 22.04 LTS**
2. USB-Stick erstellen (Tool: **balenaEtcher** oder **Rufus**)
3. Mac vom USB booten (beim Start **Option/Alt** gedrückt halten)
4. „Ubuntu installieren“ — Festplatte kann **komplett** für Linux genutzt werden
5. Benutzer anlegen, z. B. Name `jjl` — merken!

### A3 — Updates + kein Schlafen

Am Mac Terminal öffnen (Suchleiste: **Terminal**):

```bash
sudo apt update && sudo apt upgrade -y
```

Schlafmodus aus:

```bash
sudo systemctl mask sleep.target suspend.target hibernate.target hybrid-sleep.target
```

### A4 — Netzwerk

- Am Router: feste IP für den Mac (optional, erleichtert SSH)
- Oder **Tailscale** installieren: [tailscale.com/download/linux](https://tailscale.com/download/linux) — dann erreichst du den Mac von überall sicher

### A5 — Strom-Test

24 Stunden am Netzteil lassen. Neustart → kommt Ubuntu wieder hoch?

---

## Phase B — Werkzeuge auf dem Mac

Alles im **Terminal** auf dem **alten Mac** (nicht auf dem Handy).

### B1 — Git

```bash
sudo apt install -y git
git --version
```

### B2 — GitHub CLI

```bash
type -p curl >/dev/null || sudo apt install curl -y
curl -fsSL https://cli.github.com/packages/githubcli-archive-keyring.gpg | sudo dd of=/usr/share/keyrings/githubcli-archive-keyring.gpg
echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/githubcli-archive-keyring.gpg] https://cli.github.com/packages stable main" | sudo tee /etc/apt/sources.list.d/github-cli.list > /dev/null
sudo apt update
sudo apt install -y gh
gh auth login
```

Bei `gh auth login`:

- GitHub.com
- HTTPS
- Im Browser anmelden (Code eingeben)

Test:

```bash
gh repo view Lauer-Team/KiezQuiz
```

### B3 — KiezQuiz klonen

```bash
cd ~
git clone https://github.com/Lauer-Team/KiezQuiz.git
cd KiezQuiz
```

### B4 — Cursor CLI

```bash
curl https://cursor.com/install -fsS | bash
```

Terminal **schließen und neu öffnen**, dann:

```bash
agent login
agent --version
```

Im Browser mit **demselben Cursor-Account** anmelden wie am Laptop.

### B5 — Einmal testen (wichtig!)

```bash
cd ~/projects/KiezQuiz
agent -p --force --trust --model auto --workspace ~/projects/KiezQuiz "Sag in einem Satz auf Deutsch, wofür index.html da ist."
```

**Erwartung:** Eine kurze deutsche Antwort im Terminal.  
**Wenn das klappt:** Cursor CLI läuft lokal — gut.

**Usage prüfen:** [cursor.com/dashboard/usage](https://cursor.com/dashboard/usage) — soll **kein** Cloud Agent sein.

---

## Phase C — Telegram (am Handy)

### C1 — Bot anlegen

1. Telegram öffnen
2. Suche: **@BotFather**
3. Sende: `/newbot`
4. Name z. B. `KiezQuiz Agent`
5. Benutzername z. B. `kiezquiz_agent_bot` (muss auf `_bot` enden)
6. **Token kopieren** — sieht aus wie `7123456789:AAH…` — **geheim**, niemandem schicken!

### C2 — Deine User-ID

1. Suche: **@userinfobot**
2. Starten → Bot schickt deine **Id** (Zahl, z. B. `123456789`)
3. Merken — nur diese Id darf später Befehle senden

---

## Phase D — Bot auf dem alten Mac

Die Dateien liegen im Repo unter `telegram-agent/` (Ordner `bot.py`, `config.example.json`, …).

Falls der Ordner noch nicht auf dem Mac ist: erst `git pull` im geklonten Repo, oder Phase B3 wiederholen nachdem du die Dateien auf GitHub gepusht hast.

### D1 — Python-Umgebung

```bash
cd ~/projects/KiezQuiz/telegram-agent
sudo apt install -y python3 python3-venv python3-pip
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

### D2 — Config (Geheimnisse, bleiben lokal)

```bash
cp config.example.json config.json
nano config.json
```

Eintragen:

- `telegram_bot_token` → Token von BotFather
- `telegram_user_id` → deine Zahl von userinfobot
- `repo_path` → z. B. `/home/jjl/projects/KiezQuiz` (dein echter Pfad!)
- `model` → `auto` lassen

E-Mail (optional, iCloud): `.env` mit `KIEZ_ICLOUD_LOGIN` + `KIEZ_ICLOUD_APP_PASSWORD` — siehe [`EMAIL.md`](EMAIL.md) und `config.example.json`.

Speichern in nano: **Strg+O**, Enter, **Strg+X**

### D3 — Manuell starten (Test)

```bash
cd ~/projects/KiezQuiz/telegram-agent
source .venv/bin/activate
python bot.py
```

Terminal offen lassen. Am Handy deinem Bot schreiben: `/help`

**Erwartung:** Hilfetext zurück.

### D4 — Dauerbetrieb (startet nach Neustart automatisch)

```bash
sudo cp ~/projects/KiezQuiz/telegram-agent/kiezquiz-agent.service /etc/systemd/system/
sudo nano /etc/systemd/system/kiezquiz-agent.service
```

Ersetze **DEIN_LINUX_USERNAME** überall durch deinen Linux-Namen (z. B. `jjl`).

Dann:

```bash
sudo systemctl daemon-reload
sudo systemctl enable kiezquiz-agent
sudo systemctl start kiezquiz-agent
sudo systemctl status kiezquiz-agent
```

**Grün / active (running)** = läuft.

Logs ansehen:

```bash
journalctl -u kiezquiz-agent -f
```

---

## Phase E — Erster End-to-End-Test

### E1 — Harmloser Test (ohne Live)

Am Handy an den Bot:

```text
/new
Füge in CHANGELOG.md ganz unten eine Zeile hinzu: Test Telegram-Agent (wird nicht deployed).
```

Warten (Minuten sind normal). Du bekommst:

- Agent-Antwort
- Bei reinen Check-Fragen **kein** PR/Deploy (auch wenn der Agent versehentlich Bot-Dateien anfasst)
- Sonst: PR-Link + „Deployen? (ja / nein)“ nur bei echten Webseiten-Änderungen

Antwort: **nein**

PR auf GitHub prüfen — dann PR schliezen oder Branch löschen.

### E2 — Echter Mini-Deploy

Kleine sichtbare Änderung (z. B. Text auf der Startseite), dann **ja**.

Nach ~2 Minuten:

```bash
curl -sS https://kiezquiz.de/version.json
```

Neuer `build`-Wert = Deploy gelaufen.

### E3 — Usage nochmal

[cursor.com/dashboard/usage](https://cursor.com/dashboard/usage) — weiterhin lokal, kein Cloud Agent.

---

## Phase F — Alltag

| Du schreibst | Was passiert |
|--------------|--------------|
| Normale Nachricht | Gleiche Session, Agent erinnert sich |
| `/new` | Frisches Gespräch |
| `/new Button größer` | Neu + sofort Aufgabe |
| `ja` oder `/deploy` | PR → main → live |
| `nein` | Nichts live |
| `/status` | Wo stehen wir? |
| `/restart` | Bot neu starten (lädt Code-Änderungen) |
| `/help` | Kurzhelp |

**Merksatz:** Neues Thema → `/new`. Nachbesserung → einfach weiter schreiben.

---

## Wenn etwas hakt

| Problem | Lösung |
|---------|--------|
| Bot antwortet nicht | `sudo systemctl status kiezquiz-agent` — läuft der Dienst? |
| „Nicht autorisiert“ | Falsche `telegram_user_id` in config.json |
| `agent: command not found` | Terminal neu öffnen; `which agent` |
| `gh auth` fehlgeschlagen | `gh auth login` wiederholen |
| Agent hängt ewig | `/status` — warten oder `/restart` (lädt neuen Code) |
| PR-Merge klappt nicht | Auf GitHub prüfen ob Checks grün; manuell mergen |

---

## Sicherheit (kurz)

- Bot-Token und config.json **nie** auf GitHub
- Bot antwortet nur deiner User-ID
- Live erst nach **ja**
- Kein `-c` / `--cloud` — das wäre teurer Cloud Agent

---

## Checkliste „Fertig?“

- [ ] Alter Mac: Ubuntu, SSD, kein Schlaf, 24h stabil
- [ ] `agent login` + Testbefehl OK
- [ ] Telegram: Bot + deine User-ID
- [ ] `config.json` ausgefüllt
- [ ] `systemctl status` = running
- [ ] Handy → `/help` → Antwort
- [ ] Test-PR → **nein**
- [ ] Echter Deploy → **ja** → kiezquiz.de aktualisiert
- [ ] Usage: kein Cloud Agent
