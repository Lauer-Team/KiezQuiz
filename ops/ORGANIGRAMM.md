# Organigramm — KiezQuiz Agenten-Struktur

> Mermaid rendert auf GitHub als Diagramm. Stand: **2026-06-15** (Masterauftrag v2 abgeschlossen)

```mermaid
flowchart TB
    subgraph mensch["👤 Du (Jeremiah)"]
        OK["Freigabe-Gates<br/>Deploy · Geld · Recht · DNS · E-Mails"]
    end

    subgraph leit["🕊️ Kalle — Leitagent"]
        K["Orchestrator<br/>ops/LEITSTAND.md · ops/PLAYBOOK.md"]
    end

    subgraph fach["Fach-Abteilungen (Cursor Rules + Automations)"]
        SEO["10-seo<br/>Technisches SEO · GSC"]
        DEV["20-devops<br/>Uptime · Smoke · Deploy"]
        SEC["30-security<br/>Dependabot · RLS · Patches"]
        FIN["40-finance<br/>Kosten · Free-Tier-Risiko"]
        SUP["50-support<br/>Stadt-Wünsche · kein GA"]
        LEGC["60-legal-coordination<br/>Trigger · Backlog · Legora-Aufträge"]
    end

    subgraph external["Extern (nicht Cursor)"]
        LEG["Legora<br/>Rechtstexte & Compliance"]
        TG["Telegram-Bot<br/>⏸️ pausiert"]
    end

    subgraph auto["Cursor Automations 🟢 live"]
        A0["Backup Archiv Sync"]
        A1["Uptime Smoke Check"]
        A2["Security Weekly"]
        A3["SEO Weekly"]
        A4["Ops Weekly Review"]
    end

    subgraph shared["Gemeinsame Dateien"]
        LS["ops/LEITSTAND.md"]
        RP["ops/reports/"]
        RT["ops/RETRO.md"]
        FINS["ops/finance/"]
        LEGF["ops/legal/"]
    end

    mensch -->|"Anweisungen"| K
    K --> SEO & DEV & SEC & FIN & SUP & LEGC
    K -->|"Legal-Arbeitsauftrag"| LEG
    LEG -->|"geprüfte Texte"| K
    mensch -.->|"⏸️"| TG

    A0 --> DEV
    A1 --> DEV
    A2 --> SEC
    A3 --> SEO
    A4 --> K

    SEO & DEV & SEC & FIN & SUP --> RP
    LEGC --> LEGF
    FIN --> FINS
    K --> LS & RT
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
| 2026-06-15 | Erstversion: Kalle, SEO, DevOps, Security |
| 2026-06-15 | 5 Automations live (inkl. Ops Weekly); Finance, Support, Legal-Koordination |
