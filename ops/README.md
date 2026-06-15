# ops — KI-Management KiezQuiz

> **Alles liegt unter den Agenten.** Dieser Ordner hat nur noch den Einstieg und generierte Dateien.

## Start hier

```
ops/
  README.md          ← du bist hier
  agents/            ← alle Agenten-Akten (CEO + 7 Fach-Agenten)
  _generated/        ← Dashboard-Snapshots (nicht manuell pflegen)
```

**CEO / dein Ansprechpartner:** [`agents/ceo-kalle/leitstand.md`](agents/ceo-kalle/leitstand.md)

**Organigramm:** [`agents/ORGANIGRAMM.md`](agents/ORGANIGRAMM.md)

**Admin-Dashboard (Live):** Profil → Admin → AI-Management

---

## Jeder Agent hat dieselbe Aktenstruktur

| Datei | Inhalt |
|---|---|
| `leitstand.md` | Status & Kurzüberblick |
| `backlog.md` | Ideen, Roadmap, später |
| `todos.md` | Offene Aufgaben (+ CEO: Fristen) |
| `memories.md` | Learnings, Retro |
| `routinen.md` | Automationen, Rhythmen |
| `anweisungen.md` | Auftrag, Grenzen, Playbook |
| `dashboard.md` | Was die Admin-UI zeigt |
| `reports.md` | Index der Berichte |
| `reports/*.md` | Einzelberichte (optional) |

Register aller Agenten: [`agents/registry.json`](agents/registry.json)

Reporting-Regeln: [`agents/PROTOKOLL.md`](agents/PROTOKOLL.md)

---

## Agenten

| Emoji | Agent | Ordner |
|---|---|---|
| 🕊️ | Kalle (CEO) | [`ceo-kalle/`](agents/ceo-kalle/) |
| 🛠️ | Theo (CTO) | [`cto-ingenieur/`](agents/cto-ingenieur/) |
| 💰 | Frida (CFO) | [`cfo-finanzen/`](agents/cfo-finanzen/) |
| ⚖️ | Lara (CLO) | [`clo-legal/`](agents/clo-legal/) |
| 📈 | Maja (CMO) | [`cmo-seo-growth/`](agents/cmo-seo-growth/) |
| ⚙️ | Oskar (COO) | [`coo-operations/`](agents/coo-operations/) |
| 🔒 | Samira (CSO) | [`cso-security/`](agents/cso-security/) |
| 💬 | Xenia (CXO) | [`cxo-support-analytics/`](agents/cxo-support-analytics/) |
