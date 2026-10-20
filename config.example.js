// Copy this file to config.js only when you want optional Supabase cloud sync.
// The anon key is designed to be public; security comes from Row Level Security.
window.AKIHQ_CONFIG = {
  // UI readiness only; server/database eligibility remain authoritative.
  ONBOARDING_SCHEMA_READY: false,
  OPERATIONAL_ANALYTICS_ENABLED: false, // Enable only after guarded RPC and acceptance.
  SUPABASE_URL: "https://YOUR_PROJECT.supabase.co",
  SUPABASE_ANON_KEY: "YOUR_SUPABASE_ANON_KEY"
};
