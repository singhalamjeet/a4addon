const { createClient } = require('@supabase/supabase-js');

// Validate environment variables
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.warn('Warning: Supabase credentials not configured. Please set SUPABASE_URL and SUPABASE_ANON_KEY environment variables.');
}

// Create Supabase client
const supabase = supabaseUrl && supabaseKey
    ? createClient(supabaseUrl, supabaseKey)
    : null;

module.exports = supabase;
