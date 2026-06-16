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

### Username-Login (RPC)

Für Anmeldung mit **Benutzername** (statt E-Mail) wird die RPC `get_email_for_username` benötigt. Im SQL Editor ausführen (Rate-Limit gegen Enumeration ist enthalten):

```sql
-- Rate-Limit-Tabelle (nur für die RPC, kein Client-Zugriff)
create table if not exists public.username_lookup_rate_limits (
  bucket text primary key,
  attempt_count int not null default 1,
  window_start timestamptz not null default now()
);

alter table public.username_lookup_rate_limits enable row level security;
revoke all on table public.username_lookup_rate_limits from public, anon, authenticated;

create or replace function public.get_email_for_username(p_username text)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_email text;
  v_bucket text;
  v_count int;
  v_max_attempts constant int := 10;
  v_window_seconds constant int := 300;
begin
  if p_username is null or length(trim(p_username)) < 2 then
    return null;
  end if;

  begin
    v_bucket := coalesce(
      nullif(trim((current_setting('request.headers', true)::json)->>'cf-connecting-ip'), ''),
      nullif(trim(split_part((current_setting('request.headers', true)::json)->>'x-forwarded-for', ',', 1)), ''),
      'user:' || lower(trim(p_username))
    );
  exception when others then
    v_bucket := 'user:' || lower(trim(p_username));
  end;

  insert into public.username_lookup_rate_limits (bucket, attempt_count, window_start)
  values (v_bucket, 1, now())
  on conflict (bucket) do update
    set
      attempt_count = case
        when username_lookup_rate_limits.window_start < now() - make_interval(secs => v_window_seconds)
        then 1
        else username_lookup_rate_limits.attempt_count + 1
      end,
      window_start = case
        when username_lookup_rate_limits.window_start < now() - make_interval(secs => v_window_seconds)
        then now()
        else username_lookup_rate_limits.window_start
      end
  returning attempt_count into v_count;

  if v_count > v_max_attempts then
    return null;
  end if;

  select u.email into v_email
  from auth.users u
  join public.profiles p on p.id = u.id
  where lower(p.username) = lower(trim(p_username));

  return v_email;
end;
$$;

revoke all on function public.get_email_for_username(text) from public;
grant execute on function public.get_email_for_username(text) to anon, authenticated, service_role;
```

**Hinweis:** `SECURITY DEFINER` + `anon`-Execute erlaubt theoretisch Username-Enumeration; das Rate-Limit (10 Versuche / 5 Min. pro IP oder Username) reduziert das Risiko. Für maximale Härte nur E-Mail-Login anbieten.

---

## 2b. Stadt-Wünsche (optional)

Damit Wünsche zentral gespeichert werden (Gäste und Accounts), im SQL Editor ausführen:

```sql
-- Wünsche / Votes für neue Städte
create table public.city_wish_requests (
  id uuid primary key default gen_random_uuid(),
  city_name text not null,
  user_id uuid references auth.users(id) on delete set null,
  guest_id text,
  request_type text not null check (request_type in ('vote', 'proposal')),
  created_at timestamptz default now(),
  constraint city_wish_actor check (user_id is not null or guest_id is not null)
);

alter table public.city_wish_requests enable row level security;

-- Kein direktes INSERT (Cooldown wird serverseitig erzwungen)
-- Inserts nur über submit_city_wish (siehe docs/sql/city-wish-cooldown.sql)

-- Admin-Tabelle (nur per SQL Editor befüllen)
create table public.city_wish_admins (
  user_id uuid primary key references auth.users(id) on delete cascade
);

alter table public.city_wish_admins enable row level security;

create or replace function public.is_city_wish_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.city_wish_admins where user_id = auth.uid());
$$;

grant execute on function public.is_city_wish_admin() to authenticated;

create policy "wish_select_admin" on public.city_wish_requests for select
using (public.is_city_wish_admin());

-- Öffentliche Vote-Zähler (ohne Account-Infos)
create or replace function public.get_city_wish_totals()
returns table(city_name text, vote_count bigint)
language sql stable security definer set search_path = public as $$
  select city_name, count(*)::bigint
  from public.city_wish_requests
  group by city_name
  order by 2 desc;
$$;

grant execute on function public.get_city_wish_totals() to anon, authenticated;

-- Admin-Liste inkl. Benutzernamen (serverseitiger Join)
create or replace function public.get_city_wish_admin_list()
returns table(
  id uuid,
  city_name text,
  user_id uuid,
  guest_id text,
  request_type text,
  created_at timestamptz,
  username text
)
language sql stable security definer set search_path = public as $$
  select
    r.id,
    r.city_name,
    r.user_id,
    r.guest_id,
    r.request_type,
    r.created_at,
    p.username
  from public.city_wish_requests r
  left join public.profiles p on p.id = r.user_id
  where public.is_city_wish_admin()
  order by r.created_at desc;
$$;

grant execute on function public.get_city_wish_admin_list() to authenticated;

-- Cooldown: pro Stadt max. 1× alle 23 Stunden (Account oder Gast)
create or replace function public.get_my_city_wish_cooldowns(p_guest_id text default null)
returns table(city_name text, next_vote_at timestamptz)
language sql stable security definer set search_path = public as $$
  select
    (array_agg(r.city_name order by r.created_at desc))[1] as city_name,
    max(r.created_at) + interval '23 hours' as next_vote_at
  from public.city_wish_requests r
  where (
    (auth.uid() is not null and r.user_id = auth.uid())
    or (
      auth.uid() is null
      and p_guest_id is not null
      and trim(p_guest_id) <> ''
      and r.guest_id = trim(p_guest_id)
    )
  )
  group by lower(trim(r.city_name))
  having max(r.created_at) + interval '23 hours' > now();
$$;

grant execute on function public.get_my_city_wish_cooldowns(text) to anon, authenticated;

create or replace function public.submit_city_wish(
  p_city_name text,
  p_request_type text default 'vote',
  p_guest_id text default null
)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_name text;
  v_key text;
  v_blocked_until timestamptz;
  v_user_id uuid;
  v_guest text;
begin
  v_name := trim(p_city_name);
  if v_name is null or v_name = '' then
    return jsonb_build_object('ok', false, 'reason', 'invalid');
  end if;
  if p_request_type not in ('vote', 'proposal') then
    return jsonb_build_object('ok', false, 'reason', 'invalid');
  end if;
  v_user_id := auth.uid();
  v_guest := nullif(trim(p_guest_id), '');
  if v_user_id is null and v_guest is null then
    return jsonb_build_object('ok', false, 'reason', 'invalid');
  end if;
  v_key := lower(v_name);
  select max(r.created_at) + interval '23 hours'
  into v_blocked_until
  from public.city_wish_requests r
  where lower(trim(r.city_name)) = v_key
    and (
      (v_user_id is not null and r.user_id = v_user_id)
      or (v_user_id is null and r.guest_id = v_guest)
    );
  if v_blocked_until is not null and v_blocked_until > now() then
    return jsonb_build_object('ok', false, 'reason', 'cooldown', 'next_vote_at', v_blocked_until);
  end if;
  insert into public.city_wish_requests (city_name, user_id, guest_id, request_type)
  values (v_name, v_user_id, case when v_user_id is null then v_guest else null end, p_request_type);
  return jsonb_build_object('ok', true);
end;
$$;

grant execute on function public.submit_city_wish(text, text, text) to anon, authenticated;
```

**Bereits deployt?** Nur die Cooldown-Funktionen nachziehen: `docs/sql/city-wish-cooldown.sql` im SQL Editor ausführen (entfernt ggf. die alte `wish_insert`-Policy). Pro Account oder Gast-Gerät darf jede Stadt nur einmal innerhalb von 23 Stunden gewünscht/voted werden; danach ist eine erneute Stimme für dieselbe Stadt möglich (tägliches Öffnen belohnen, Spam verhindern).

Falls du die Unique-Indizes aus einer früheren Version bereits angelegt hast, einmal entfernen:

```sql
drop index if exists public.city_wish_unique_user;
drop index if exists public.city_wish_unique_guest;
drop function if exists public.get_my_city_wishes(text);
```

**Admin eintragen** (deine User-UUID aus Authentication → Users):

```sql
insert into public.city_wish_admins (user_id) values ('DEINE-USER-UUID');
```

Alternativ in `src/supabaseConfig.js`: `adminUserIds: ['DEINE-USER-UUID']`.

**Wünsche einsehen:** Als Admin im **Dashboard** (`/profile/`) → Seitenleiste **Admin** → **Städte-Wünsche**, oder Supabase **Table Editor** → `city_wish_requests`.

---

## 2c. Profil, Freunde & Bestenliste (optional)

Für eingeloggte Nutzer: persönliche Bestwerte pro Stadt, Freundesliste und öffentliche Bestenliste. Im SQL Editor ausführen:

**Neu deployt:** `docs/sql/profile-social-leaderboard.sql` (Tabellen `user_city_best_scores`, `friend_requests` + RPCs; kein direkter Client-Zugriff auf Tabellen).

Nach dem Ausführen:

| Feature | Wo in der App |
|---------|----------------|
| Profil & Erfolge | `/profile/` (nur eingeloggt) |
| Freunde suchen / anfragen | Profil → Freunde |
| Bestenliste | Profil → Bestenliste |
| Bestwert nach Runde | Automatisch nach Spielende (wenn eingeloggt) |

**Manuell testen:** Zwei Test-Accounts anlegen, Freundschaftsanfrage senden/annehmen, je eine Runde spielen, Bestenliste prüfen.

### Admin: Spieler-Aktivität

Im SQL Editor ausführen: `docs/sql/admin-player-activity.sql` (Tabelle `player_game_log`, RPCs `log_player_game`, `get_admin_play_volume`, `get_admin_player_activity`; importiert bestehende Runden aus Cloud-Spielständen).

Im Dashboard unter **Admin → Spieler-Aktivität**: Karten für Heute / Woche / Monat / Jahr / Gesamt plus Tabelle pro Spieler. Neue Runden werden beim Spielen automatisch geloggt (nur eingeloggte Nutzer).

---

## 3. E-Mail-Auth konfigurieren

1. Links **Authentication** → **Providers**.
2. **Email** sollte **aktiviert** sein (Standard).
3. Für den Start: **Confirm email** **deaktivieren** (einfacher zum Testen — später wieder einschalten möglich).
4. **Save** klicken.

---

## 4. Redirect-URLs eintragen

1. **Authentication** → **URL Configuration**.
2. **Site URL:** `https://kiezquiz.de`
3. **Redirect URLs** — jede Zeile einzeln hinzufügen:
   - `https://kiezquiz.de/**`
   - `https://kiezquiz.lauer.team/**`
   - `http://localhost:3000/**`
4. **Save** klicken.

---

## 5. API-Keys in die App eintragen

### Lokal

1. **Project Settings** (Zahnrad unten links) → **API**.
2. Kopiere **Project URL** und **anon public** Key (beginnt mit `eyJ…` — **nicht** `service_role`).
3. Vorlage kopieren und Keys eintragen:

```bash
cp src/supabaseConfig.example.js src/supabaseConfig.js
```

```javascript
window.SUPABASE_CONFIG = {
  url: 'https://DEIN-PROJEKT.supabase.co',
  anonKey: 'eyJ...dein-anon-key...'
};
```

`src/supabaseConfig.js` steht in `.gitignore` und darf **nicht** ins Repository.

### GitHub Pages (CI)

Im Repo **Settings → Secrets and variables → Actions** anlegen (wie bei BottleBuddy):

| Secret | Inhalt |
|--------|--------|
| `VITE_SUPABASE_URL` | Project URL |
| `VITE_SUPABASE_ANON_KEY` | anon public Key |

Alternativ `SUPABASE_URL` und `SUPABASE_ANON_KEY` — das Deploy-Workflow akzeptiert beide Paare.

Bei Push auf `main` erzeugt [`.github/workflows/deploy.yml`](../.github/workflows/deploy.yml) `src/supabaseConfig.js` und deployt nach GitHub Pages.

---

## 6. Deploy & testen

```bash
cd KiezQuiz
git add -A
git commit -m "…"
git push
```

GitHub Actions deployt nach Pages (Secrets müssen gesetzt sein). Dann testen:

| Test | Erwartung |
|------|-----------|
| Seite ohne Login | Header zeigt „Gast · Anmelden“, Spiel funktioniert wie bisher |
| Registrieren | Username + E-Mail + Passwort → Header zeigt Username |
| XP sammeln, Seite neu laden | Fortschritt bleibt (Cloud + localStorage) |
| Abmelden | Zurück zu Gast, lokaler Stand bleibt |
| Anderes Gerät, gleicher Account | Höherer XP-Stand gewinnt beim Login |

---

## 7. NB-Änderungen: E-Mail an alle Nutzer

Bei wesentlichen Änderungen der Nutzungsbedingungen müssen registrierte Nutzer per E-Mail informiert werden (§ 10 NB).

**Bereits eingerichtet:** Edge Function `notify-terms-change` im Projekt KiezQuiz Backend.

**Einmalig Secrets setzen:** Edge Functions → `notify-terms-change` → Secrets:

- `NOTIFY_TERMS_SECRET` — siehe `scripts/terms-notify.config.json` (lokal, via `python3 scripts/setup_terms_notify.py`)
- `SMTP_LOGIN` + `SMTP_APP_PASSWORD` — iCloud (Apple-ID + App-Passwort, siehe `telegram-agent/EMAIL.md`)

Vollständiger Ablauf: **`docs/TERMS-CHANGE-PROCESS.md`**

---

## Fehlerbehebung

| Problem | Lösung |
|---------|--------|
| „Cloud-Speicherung ist nicht konfiguriert“ | Keys in `supabaseConfig.js` prüfen — keine Platzhalter mehr |
| Registrierung schlägt fehl | E-Mail-Bestätigung ist in Produktion **aktiv** — Nutzer muss Bestätigungslink öffnen. Für lokale Tests ggf. temporär deaktivieren (Dashboard → Authentication → Providers → Email) |
| Spielstand sync nicht | Browser-Konsole (F12) → Netzwerk/Console auf Fehler prüfen |
| RLS-Fehler | SQL-Skript aus Schritt 2 erneut ausführen |
| NB-Versand HTTP 401 | `NOTIFY_TERMS_SECRET` in Supabase = `notifySecret` in lokaler Config |
| NB-Versand SMTP-Fehler | `SMTP_LOGIN` + `SMTP_APP_PASSWORD` in Supabase Secrets (Apple-ID + App-Passwort) |
| Kein DB-Backup (Free Tier) | Monatlicher Export: `docs/BACKUP-SUPABASE.md` |

---

## Backups (Free Tier)

Supabase Free hat keine automatischen DB-Backups. Einrichtung:

```bash
python3 scripts/setup_supabase_backup.py
# databaseUrl in scripts/backup-supabase.config.json eintragen
python3 scripts/export_supabase_backup.py
```

Optional automatisch jeden Monat via GitHub Actions (Secret `KIEZ_SUPABASE_DB_URL`). Details: **`docs/BACKUP-SUPABASE.md`**

---

## Datenschutz (Kurz)

- **Gast:** Nur localStorage im Browser, keine Übertragung.
- **Mit Account:** E-Mail, Benutzername und Spielstand (JSON) werden über TLS bei Supabase in der EU gespeichert.
- Der **anon Key** ist im Frontend sichtbar — das ist bei SPAs normal; **Row Level Security** verhindert Zugriff auf fremde Daten.
- **Niemals** den `service_role` Key ins Frontend packen.
