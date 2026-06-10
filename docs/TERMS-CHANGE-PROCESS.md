# Nutzungsbedingungen ändern & Nutzer benachrichtigen

Rechtliche Pflicht (§ 10 NB): **Wesentliche** Änderungen der Nutzungsbedingungen erfordern:

1. **Mindestens 30 Tage** Vorlauf bis Inkrafttreten
2. **E-Mail** an alle registrierten Nutzer (Adresse aus Supabase Auth)
3. **Deutlicher Hinweis** auf der Website für Gäste ohne Account

Cursor erkennt Änderungen an den NB-Texten automatisch (Regel + Hook) und führt diesen Ablauf aus.

---

## Ablauf (kurz)

```
Texte ändern → Version bumpen → Freigabe durch Betreiber → Dry-Run → E-Mails senden → Deploy
```

| Schritt | Wer | Was |
|--------|-----|-----|
| 1 | Cursor / du | NB in `src/locales/de.json` + `en.json` (`legalPages.terms`) anpassen |
| 2 | Cursor | `src/data/legalConfig.js`: `terms.version` + `terms.effectiveDate` (+30 Tage) setzen |
| 3 | **Du** | Texte prüfen und explizit freigeben: *„NB-Änderung freigegeben“* |
| 4 | Cursor / du | `python3 scripts/notify_terms_change.py --dry-run` |
| 5 | **Du** | Dry-Run ok? → `python3 scripts/notify_terms_change.py --send --owner-approved` |
| 6 | Cursor / du | Commit + Push auf `main` (Website-Hinweis + neue NB live) |

**Ohne Schritt 3 + `--owner-approved` sendet das Skript keine E-Mails.**

---

## Version & Datum pflegen

In `src/data/legalConfig.js`:

```javascript
terms: {
  version: '2026-06-10',           // bei jeder wesentlichen NB-Änderung erhöhen (ISO-Datum empfohlen)
  effectiveDate: '2026-07-10',     // frühestens heute + 30 Tage
  lastNotifiedVersion: null,       // wird vom Skript nach erfolgreichem Versand gesetzt
  pendingNotice: false             // true = Website-Banner aktiv (Gäste-Hinweis)
}
```

- **Unwesentliche** Korrekturen (Tippfehler): nur `lastUpdated` anpassen, **keine** E-Mail, `terms.version` unverändert lassen.
- **Wesentliche** Änderungen: `terms.version` bumpen, `effectiveDate` = Versandtag + 30 Tage.

---

## Einmalige Einrichtung (E-Mail-Versand)

**Automatisch erledigt (Cursor/Setup):**
- Edge Function `notify-terms-change` auf Supabase (KiezQuiz Backend)
- Lokale Config: `python3 scripts/setup_terms_notify.py` (bereits ausgeführt)
- GitHub Secret `NOTIFY_TERMS_SECRET` (für Actions-Workflow)

**Du musst einmalig im [Supabase Dashboard](https://supabase.com/dashboard/project/iuixaesbzftgmnmelcad/functions) eintragen:**

Edge Functions → `notify-terms-change` → **Secrets**:

| Secret | Wert |
|--------|------|
| `NOTIFY_TERMS_SECRET` | identisch mit `notifySecret` in `scripts/terms-notify.config.json` |
| `RESEND_API_KEY` | API-Key von [resend.com](https://resend.com) (Domain `kiezquiz.de` verifizieren) |

Optional: `FROM_EMAIL=info@kiezquiz.de`, `SITE_URL=https://kiezquiz.de`

Danach testen:
```bash
python3 scripts/notify_terms_change.py --dry-run
python3 scripts/notify_terms_change.py --send --owner-approved --test-to info@kiezquiz.de
```

Alternativ: GitHub → Actions → **Notify terms change** → `dry-run` / `send` mit `owner_approved=true`.

`scripts/terms-notify.config.json` steht in `.gitignore`.

---

## Skript-Befehle

```bash
# Empfängerliste + E-Mail-Vorschau (kein Versand)
python3 scripts/notify_terms_change.py --dry-run

# Versand nach deiner Freigabe
python3 scripts/notify_terms_change.py --send --owner-approved

# Nur an dich (Test)
python3 scripts/notify_terms_change.py --send --owner-approved --test-to info@kiezquiz.de
```

Nach `--send`:

- E-Mails an alle `auth.users` mit bestätigter E-Mail-Adresse
- `terms.lastNotifiedVersion` und `terms.pendingNotice: true` in `legalConfig.js`
- `src/data/termsNotice.json` für den Website-Banner
- Log in `scripts/.terms-notify-log.json` (gitignored)

---

## Website-Hinweis (Gäste)

Solange `terms.pendingNotice === true`, zeigt `src/ui/cookieConsent.js` einen gelben Hinweis-Banner mit Link zu `/nutzungsbedingungen/` und dem Datum `effectiveDate`.

Nach Inkrafttreten: `pendingNotice: false` setzen (manuell oder beim nächsten Deploy).

---

## Cursor-Integration

| Mechanismus | Datei | Wirkung |
|-------------|-------|---------|
| **Regel** | `.cursor/rules/terms-change-notify.mdc` | Agent kennt Pflichtschritte bei NB-Edits |
| **Hook** | `.cursor/hooks/after-terms-edit.sh` | Erinnert nach Datei-Edit an diesen Prozess |

Hook testen: NB-Abschnitt in `de.json` speichern → Agent soll Dry-Run + Freigabe erwähnen.

---

## Checkliste vor Deploy

- [ ] DE + EN NB synchron geändert
- [ ] `terms.version` + `terms.effectiveDate` gesetzt
- [ ] Betreiber-Freigabe erteilt
- [ ] `--dry-run` geprüft
- [ ] `--send --owner-approved` erfolgreich
- [ ] `CHANGELOG.md` / `docs/APP-NEWS.md` ergänzt (optional)
