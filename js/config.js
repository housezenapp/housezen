const SUPABASE_URL = 'https://rplieisbxvruijvnxbya.supabase.co';
const SUPABASE_KEY = 'sb_publishable_bwA6-ahysrqAjTYZsgbzVw_PbZ7-BQR';
const _supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

let currentUser = null;
let authInitialized = false;
