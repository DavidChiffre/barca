// Template for js/config.js (committed — the anon key is public by design,
// RLS is the security boundary). Fill in your Supabase project details;
// js/config.js is loaded by index.html before the app bundle, and sync
// stays disabled while the placeholders are in place.
//
// In Supabase (SQL editor), create the shared table once:
//
//   create table if not exists barca_state (
//     key text primary key,
//     value jsonb not null,
//     updated_at timestamptz not null default now(),
//     updated_by text
//   );
//   alter table barca_state enable row level security;
//   create policy "barca anon select" on barca_state for select to anon using (true);
//   create policy "barca anon insert" on barca_state for insert to anon with check (true);
//   create policy "barca anon update" on barca_state for update to anon using (true);
//
// Note: the anon key is visible in the deployed site, so with these policies
// anyone who can find the project URL can read the table. To restrict access
// to just the two of you, switch the policies to
//   ... using (auth.role() = 'authenticated')
// and sign in with magic-link auth.
window.BARCA_CONFIG = {
  url: 'https://YOUR-PROJECT.supabase.co',
  anonKey: 'YOUR-ANON-KEY',
  table: 'barca_state'
};
