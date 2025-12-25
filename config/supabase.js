const { createClient } = require('@supabase/supabase-js');

// Validate environment variables
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.warn('Warning: Supabase credentials not configured. Please set SUPABASE_URL and SUPABASE_ANON_KEY environment variables.');
}

// Create regular Supabase client (for general use)
const supabase = supabaseUrl && supabaseKey
    ? createClient(supabaseUrl, supabaseKey)
    : null;

// Create admin client (for admin operations like listing users)
const supabaseAdmin = supabaseUrl && supabaseServiceKey
    ? createClient(supabaseUrl, supabaseServiceKey, {
        auth: {
            autoRefreshToken: false,
            persistSession: false
        }
    })
    : null;

module.exports = supabase;
module.exports.supabaseAdmin = supabaseAdmin;
