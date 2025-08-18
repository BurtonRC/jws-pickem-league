import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://pliswiceskoebzcxbgwt.supabase.co'; // replace with your URL
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBsaXN3aWNlc2tvZWJ6Y3hiZ3d0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ5MTkwNTIsImV4cCI6MjA3MDQ5NTA1Mn0.2Bl-0aRiSP5zdsuqCE6z5ER_KjUcOhFPJQY_t-XGawc'; // replace with your anon public key

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
