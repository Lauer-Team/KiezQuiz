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

create policy "wish_insert" on public.city_wish_requests for insert
with check (
  (auth.uid() is not null and user_id = auth.uid())
  or (auth.uid() is null and user_id is null and guest_id is not null)
);

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
```

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

**Wünsche einsehen:** Einstellungen (⚙️) → „Admin-Bereich öffnen“ (nur als Admin) unter `/admin/`, oder Supabase **Table Editor** → `city_wish_requests`.

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
