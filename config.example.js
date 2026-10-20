// Copy this file to config.js only when you want optional Supabase cloud sync.
// The anon key is designed to be public; security comes from Row Level Security.
window.AKIHQ_CONFIG = {
  OPERATIONAL_ANALYTICS_ENABLED: false, // Enable only after guarded RPC and acceptance.
  SUPABASE_URL: "https://YOUR_PROJECT.supabase.co",
  SUPABASE_ANON_KEY: "YOUR_SUPABASE_ANON_KEY"
};
