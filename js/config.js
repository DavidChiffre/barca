// Cross-device sync config. The Supabase publishable key is public by
// design (row-level security is the security boundary), so this file is
// committed. See js/config.example.js for the one-time SQL that creates
// the barca_state table.
window.BARCA_CONFIG = {
  url: 'https://jcrecrjmedtdccikrhhj.supabase.co',
  anonKey: 'sb_publishable_3llnkLy8FSICcpsYZ6fF2g_Ijg9FMrL',
  table: 'barca_state'
};
