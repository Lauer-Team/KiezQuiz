# KiezQuiz — Supabase einrichten (Schritt für Schritt)

Diese Anleitung richtet **optionale Cloud-Speicherung** für KiezQuiz ein. Ohne Supabase läuft die App weiterhin im **Gast-Modus** (nur localStorage).

---

## 1. Supabase-Projekt anlegen

1. Öffne [supabase.com](https://supabase.com) und melde dich an (oder registriere dich).
2. Klicke auf **New project**.
3. Wähle eine **Organisation** (oder lege eine an).
4. **Name:** z. B. `kiezquiz`
5. **Database Password:** sicheres Passwort notieren (nur für DB-Zugriff, nicht für die App).
6. **Region:** **EU (Frankfurt)** — wichtig für Datenschutz.
7. Klicke **Create new project** und warte ~2 Minuten, bis das Projekt bereit ist.

---

## 2. Datenbank-Schema anlegen

1. Im Supabase-Dashboard links auf **SQL Editor** klicken.
2. **New query** wählen.
3. Den folgenden SQL-Block **komplett** einfügen und auf **Run** klicken:

```sql
-- 1) Profil-Tabelle (Anzeigename)
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text unique not null,
  created_at timestamptz default now()
);

-- 2) Spielstand (ein JSON pro User)
create table public.game_saves (
  user_id uuid primary key references auth.users(id) on delete cascade,
  save_data jsonb not null default '{}'::jsonb,
  updated_at timestamptz default now()
);

-- 3) Auto-Profil bei Registrierung
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, username)
  values (new.id, coalesce(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1)));
  insert into public.game_saves (user_id) values (new.id);
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- 4) RLS aktivieren
alter table public.profiles enable row level security;
alter table public.game_saves enable row level security;

-- 5) Policies: User sieht/nur eigene Daten
create policy "profiles_select_own" on public.profiles for select using (auth.uid() = id);
create policy "profiles_update_own" on public.profiles for update using (auth.uid() = id);

create policy "saves_select_own" on public.game_saves for select using (auth.uid() = user_id);
create policy "saves_insert_own" on public.game_saves for insert with check (auth.uid() = user_id);
create policy "saves_update_own" on public.game_saves for update using (auth.uid() = user_id);
```

4. Unten sollte **Success** erscheinen. Falls Fehler wie „already exists“ kommen, hast du das Skript vermutlich schon ausgeführt — dann ist alles in Ordnung.

---

## 3. E-Mail-Auth konfigurieren

1. Links **Authentication** → **Providers**.
2. **Email** sollte **aktiviert** sein (Standard).
3. Für den Start: **Confirm email** **deaktivieren** (einfacher zum Testen — später wieder einschalten möglich).
4. **Save** klicken.

---

## 4. Redirect-URLs eintragen

1. **Authentication** → **URL Configuration**.
2. **Site URL:** `https://kiezquiz.lauer.team`
3. **Redirect URLs** — jede Zeile einzeln hinzufügen:
   - `https://kiezquiz.lauer.team/**`
   - `https://logic3.github.io/KiezQuiz/**`
   - `http://localhost:3000/**`
4. **Save** klicken.

---

## 5. API-Keys in die App eintragen

1. **Project Settings** (Zahnrad unten links) → **API**.
2. Kopiere:
   - **Project URL** (z. B. `https://abcdefgh.supabase.co`)
   - **anon public** Key (beginnt mit `eyJ…` — **nicht** den `service_role` Key!)
3. Öffne in deinem KiezQuiz-Projekt die Datei **`src/supabaseConfig.js`**.
4. Ersetze die Platzhalter:

```javascript
window.SUPABASE_CONFIG = {
  url: 'https://DEIN-PROJEKT.supabase.co',
  anonKey: 'eyJ...dein-anon-key...'
};
```

5. Speichern. Optional: In `.gitignore` die Zeile `# src/supabaseConfig.js` entkommentieren, wenn du echte Keys **nicht** committen willst.

---

## 6. Deploy & testen

```bash
cd KiezQuiz
git add -A
git commit -m "Supabase Cloud-Sync aktivieren"
git push
```

GitHub Pages deployt automatisch. Dann testen:

| Test | Erwartung |
|------|-----------|
| Seite ohne Login | Header zeigt „Gast · Anmelden“, Spiel funktioniert wie bisher |
| Registrieren | Username + E-Mail + Passwort → Header zeigt Username |
| XP sammeln, Seite neu laden | Fortschritt bleibt (Cloud + localStorage) |
| Abmelden | Zurück zu Gast, lokaler Stand bleibt |
| Anderes Gerät, gleicher Account | Höherer XP-Stand gewinnt beim Login |

---

## Fehlerbehebung

| Problem | Lösung |
|---------|--------|
| „Cloud-Speicherung ist nicht konfiguriert“ | Keys in `supabaseConfig.js` prüfen — keine Platzhalter mehr |
| Registrierung schlägt fehl | E-Mail-Bestätigung in Supabase deaktiviert? |
| Spielstand sync nicht | Browser-Konsole (F12) → Netzwerk/Console auf Fehler prüfen |
| RLS-Fehler | SQL-Skript aus Schritt 2 erneut ausführen |

---

## Datenschutz (Kurz)

- **Gast:** Nur localStorage im Browser, keine Übertragung.
- **Mit Account:** E-Mail, Benutzername und Spielstand (JSON) werden über TLS bei Supabase in der EU gespeichert.
- Der **anon Key** ist im Frontend sichtbar — das ist bei SPAs normal; **Row Level Security** verhindert Zugriff auf fremde Daten.
- **Niemals** den `service_role` Key ins Frontend packen.
