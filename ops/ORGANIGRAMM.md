# Organigramm — KiezQuiz Agenten-Struktur

> Mermaid rendert auf GitHub als Diagramm. Stand: 2026-06-15

```mermaid
flowchart TB
    subgraph mensch["👤 Du (Jeremiah)"]
        OK["Freigabe-Gates<br/>Deploy · Geld · Recht · DNS · E-Mails"]
    end

    subgraph leit["🕊️ Kalle — Leitagent"]
        K["Orchestrator<br/>ops/LEITSTAND.md · ops/PLAYBOOK.md"]
    end

    subgraph fach["Fach-Abteilungen (Cursor Rules + Automations)"]
        SEO["10-seo<br/>Technisches SEO · GSC-Briefings"]
        DEV["20-devops-monitoring<br/>Uptime · Smoke-Tests · Deploy-Health"]
        SEC["30-security<br/>Dependabot · Secret-Scan · Patches als PR"]
        FIN["40-finance<br/>Phase 2 · nur Vorbereitung"]
        SUP["50-support-analytics<br/>Phase 2 · ohne Tracking-Cookies"]
    end

    subgraph external["Extern (nicht Cursor)"]
        LEG["Legora<br/>Legal & Compliance"]
        TG["Telegram-Bot<br/>⏸️ pausiert"]
    end

    subgraph auto["Cursor Automations (geplant)"]
        A1["SEO-Wochenbriefing"]
        A2["Uptime-Check"]
        A3["Security-Scan"]
    end

    subgraph shared["Gemeinsame Dateien"]
        LS["ops/LEITSTAND.md"]
        RP["ops/reports/"]
        RT["ops/RETRO.md"]
        TS["ops/TECHSTACK.md"]
    end

    mensch -->|"Anweisungen"| K
    K -->|"koordiniert"| SEO
    K -->|"koordiniert"| DEV
    K -->|"koordiniert"| SEC
    K -->|"koordiniert"| FIN
    K -->|"koordiniert"| SUP
    K -->|"Legal-Arbeitsauftrag"| LEG
    LEG -->|"geprüfte Texte"| K
    mensch -.->|"⏸️"| TG

    SEO --> RP
    DEV --> RP
    SEC --> RP
    A1 --> SEO
    A2 --> DEV
    A3 --> SEC

    K --> LS
    K --> RT
    SEO --> LS
    DEV --> LS
    SEC --> LS

    OK -.->|"Gate"| mensch
    K -->|"PR + Erklärung"| OK
```

## Freigabe-Gates (nur du)

| Aktion | Gate |
|---|---|
| Merge auf `main` / Live-Deploy | ✅ dein OK |
| E-Mails an Nutzer (NB, Marketing) | ✅ dein OK |
| Rechtstexte veröffentlichen | ✅ Legora + dein OK |
| DNS / Domain / Cloudflare-Redirect | ✅ dein OK |
| Supabase Pro / kostenpflichtige Upgrades | ✅ dein OK |
| Buchungen / Steuer | ✅ du + Steuerberater |

## Änderungshistorie

| Datum | Änderung |
|---|---|
| 2026-06-15 | Erstversion: Kalle, SEO, DevOps, Security; Telegram pausiert; Finance/Support Phase 2 |
