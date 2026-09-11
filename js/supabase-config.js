// Configuracion publica de Supabase.
// Reemplaza estos valores por los de tu proyecto. Nunca coloques aqui service_role key.
window.CLOUDTASKS_SUPABASE_URL = '';
window.CLOUDTASKS_SUPABASE_ANON_KEY = '';

window.cloudTasksSupabase = window.CLOUDTASKS_SUPABASE_URL && window.CLOUDTASKS_SUPABASE_ANON_KEY
  ? window.supabase.createClient(
      window.CLOUDTASKS_SUPABASE_URL,
      window.CLOUDTASKS_SUPABASE_ANON_KEY
    )
  : null;
