const express = require('express');
const path = require('path');
const supabase = require('./config/supabase');
const adminRoutes = require('./routes/admin');

const app = express();
const PORT = process.env.PORT || 3000;

// Parse JSON request bodies
app.use(express.json());

// Root route
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Health check endpoint for deployment platforms
app.get('/health', (req, res) => {
    res.status(200).json({ status: 'ok' });
});

// Supabase status endpoint
app.get('/api/supabase-status', (req, res) => {
    if (supabase) {
        res.status(200).json({
            status: 'connected',
            message: 'Supabase client is configured'
        });
    } else {
        res.status(503).json({
            status: 'not_configured',
            message: 'Supabase credentials not set. Please configure SUPABASE_URL and SUPABASE_ANON_KEY environment variables.'
        });
    }
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server is running on port ${PORT}`);
    if (supabase) {
        console.log('✓ Supabase client configured');
    } else {
        console.log('⚠ Supabase not configured - set environment variables');
    }
});
