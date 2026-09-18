-- Shared saves for the playground: one row per named snapshot a designer keeps for the developers.
-- Run once in Supabase → SQL Editor. The shell talks to this table over REST with the anon key
-- (playground/shell.js, REMOTE); the policies below are what that key may do.

create table if not exists public.presets (
  id          text primary key default substr(replace(gen_random_uuid()::text, '-', ''), 1, 8),
  module      text not null,                 -- the module id: beam, hero, button …
  name        text not null,                 -- what the designer called it
  author      text,                          -- who saved it (asked once per browser)
  snapshot    jsonb not null,                -- { state, ui } exactly as the shell's share link carries it
  created_at  timestamptz not null default now()
);

create index if not exists presets_module_created on public.presets (module, created_at desc);

alter table public.presets enable row level security;

-- an internal tool: anyone with the link reads, anyone in the playground saves or deletes.
-- Tighten to authenticated users once sign-in is added (drop these, add `using (auth.role() = 'authenticated')`).
create policy "presets: read"   on public.presets for select using (true);
create policy "presets: insert" on public.presets for insert with check (true);
create policy "presets: delete" on public.presets for delete using (true);
