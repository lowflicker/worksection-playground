-- Shared saves (presets) and notes for the playground: one row per named snapshot a designer keeps
-- for the developers, one per note pinned to a module's element.
-- Run in Supabase → SQL Editor; every statement is idempotent, so re-running it after a change is fine.
-- The shell talks to these tables over REST with the anon key (playground/shell.js, REMOTE); the policies
-- below are what that key may do: anyone reads (links must work for everyone), only a signed-in person
-- from the company's Google Workspace saves, only the author deletes.
--
-- Sign-in is a magic link (PKCE) mailed to the company address: Supabase's Email provider with its
-- default template, no Google console — the trigger below refuses every other domain.
-- Once, in the dashboard:
--   1. Authentication → URL Configuration → Redirect URLs:
--        https://lowflicker.github.io/worksection-playground/   and   http://localhost:*/
--   2. Optional, strictest: Authentication → Sign In / Providers → «Allow new users to sign up» off, and
--      add people yourself with «Invite user». Then nobody outside can even make Supabase send a mail.
--   3. Supabase's own mailer allows a few mails per hour, enough for a team that signs in once per
--      browser. If it ever gets in the way: Authentication → Emails → SMTP Settings, any provider.

create table if not exists public.presets (
  id          text primary key default substr(replace(gen_random_uuid()::text, '-', ''), 1, 8),
  module      text not null,                 -- the module id: beam, hero, button …
  name        text not null,                 -- what the designer called it
  author      text,                          -- who saved it, for the list (Google's name)
  snapshot    jsonb not null,                -- { state, ui } exactly as the shell's share link carries it
  created_at  timestamptz not null default now()
);
-- who saved it, for the policies (added after the first version of this file)
alter table public.presets add column if not exists owner uuid default auth.uid() references auth.users (id) on delete set null;

create index if not exists presets_module_created on public.presets (module, created_at desc);

alter table public.presets enable row level security;

drop policy if exists "presets: read"   on public.presets;
drop policy if exists "presets: insert" on public.presets;
drop policy if exists "presets: delete" on public.presets;
create policy "presets: read"   on public.presets for select using (true);
create policy "presets: insert" on public.presets for insert to authenticated
  with check (owner = auth.uid() and lower(auth.jwt() ->> 'email') like '%@worksection.ua');
create policy "presets: delete" on public.presets for delete to authenticated
  using (owner = auth.uid());

-- No account outside the Workspace, even if the consent screen ever opens up: the sign-up itself fails.
create or replace function public.only_company_accounts() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.email is null or lower(new.email) not like '%@worksection.ua' then
    raise exception 'only @worksection.ua accounts may sign in';
  end if;
  return new;
end $$;
revoke execute on function public.only_company_accounts() from anon, authenticated, public; -- not an API
drop trigger if exists only_company_accounts on auth.users;
create trigger only_company_accounts before insert on auth.users
  for each row execute function public.only_company_accounts();

-- ---------------------------------------------------------------------------------------------
-- Notes pinned to a module's elements («Нотатки» in the shell): a CSS path from the module's frame
-- to the element and what the designer says about it. Same access as presets; anyone in the
-- company may tick «done», the author deletes.
create table if not exists public.notes (
  id          text primary key default substr(replace(gen_random_uuid()::text, '-', ''), 1, 8),
  module      text not null,
  selector    text not null,
  label       text,
  text        text not null,
  author      text,
  owner       uuid default auth.uid() references auth.users (id) on delete set null,
  done        boolean not null default false,
  created_at  timestamptz not null default now()
);
create index if not exists notes_module_created on public.notes (module, created_at);
alter table public.notes enable row level security;
drop policy if exists "notes: read"   on public.notes;
drop policy if exists "notes: insert" on public.notes;
drop policy if exists "notes: update" on public.notes;
drop policy if exists "notes: delete" on public.notes;
create policy "notes: read"   on public.notes for select using (true);
create policy "notes: insert" on public.notes for insert to authenticated
  with check (owner = auth.uid() and lower(auth.jwt() ->> 'email') like '%@worksection.ua');
create policy "notes: update" on public.notes for update to authenticated
  using (lower(auth.jwt() ->> 'email') like '%@worksection.ua')
  with check (lower(auth.jwt() ->> 'email') like '%@worksection.ua');
create policy "notes: delete" on public.notes for delete to authenticated
  using (owner = auth.uid());

-- Replies under a note: the thread a developer answers in. Same access as notes.
create table if not exists public.note_replies (
  id          text primary key default substr(replace(gen_random_uuid()::text, '-', ''), 1, 8),
  note_id     text not null references public.notes (id) on delete cascade,
  text        text not null,
  author      text,
  owner       uuid default auth.uid() references auth.users (id) on delete set null,
  created_at  timestamptz not null default now()
);
create index if not exists note_replies_note on public.note_replies (note_id, created_at);
alter table public.note_replies enable row level security;
drop policy if exists "note_replies: read"   on public.note_replies;
drop policy if exists "note_replies: insert" on public.note_replies;
drop policy if exists "note_replies: delete" on public.note_replies;
create policy "note_replies: read"   on public.note_replies for select using (true);
create policy "note_replies: insert" on public.note_replies for insert to authenticated
  with check (owner = auth.uid() and lower(auth.jwt() ->> 'email') like '%@worksection.ua');
create policy "note_replies: delete" on public.note_replies for delete to authenticated
  using (owner = auth.uid());
