const SUPABASE_URL = 'https://zwzpqjbrpacxwmmbdvqt.supabase.co'; // <-- Paste your Project URL here
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp3enBxamJycGFjeHdtbWJkdnF0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU0MTIzMDEsImV4cCI6MjA3MDk4ODMwMX0.vAUWPj8pZ2TCGGQ7VLbAQOPxQysUX9T5Hr0JI-yjdUg'; // <-- Paste your anon public key here

const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
