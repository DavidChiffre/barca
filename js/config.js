// Cross-device sync config. The Supabase anon key is public by design
// (row-level security is the security boundary), so this file is committed.
// Replace the placeholders with your project's URL and anon key
// (Supabase dashboard -> Project Settings -> API). See js/config.example.js
// for the one-time SQL that creates the barca_state table.
window.BARCA_CONFIG = {
  url: 'https://YOUR-PROJECT.supabase.co',
  anonKey: 'YOUR-ANON-KEY',
  table: 'barca_state'
};
