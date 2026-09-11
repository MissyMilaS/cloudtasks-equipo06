// Configuracion publica de Supabase.
// Reemplaza estos valores por los de tu proyecto. Nunca coloques aqui service_role key.
window.CLOUDTASKS_SUPABASE_URL = 'https://cznqqhlbzmpyxzjvcfrv.supabase.co';
window.CLOUDTASKS_SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN6bnFxaGxiem1weXh6anZjZnJ2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg5Nzk0NzQsImV4cCI6MjEwNDU1NTQ3NH0.8Ifp8CrbSDIBc4oVjex1jdudUjRjzTqsOtFaK0YfJlk';

window.cloudTasksSupabase = window.CLOUDTASKS_SUPABASE_URL && window.CLOUDTASKS_SUPABASE_ANON_KEY
  ? window.supabase.createClient(
      window.CLOUDTASKS_SUPABASE_URL,
      window.CLOUDTASKS_SUPABASE_ANON_KEY
    )
  : null;
