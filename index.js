const express = require('express');
const path = require('path');
const supabase = require('./config/supabase');
const adminRoutes = require('./routes/admin');
const paymentSettingsRoutes = require('./routes/payment-settings');
const checkoutRoutes = require('./routes/checkout');
const socialAuthRoutes = require('./routes/social-auth');
const widgetsRoutes = require('./routes/widgets');
const widgetFeedRoutes = require('./routes/widget-feed');

const app = express();
const PORT = process.env.PORT || 3000;

// Parse JSON request bodies
app.use(express.json());

// Serve static files from public directory
app.use(express.static('public'));

// Mount admin API routes
app.use('/api/admin', adminRoutes);
app.use('/api/admin/payment-settings', paymentSettingsRoutes);

// Mount checkout routes
app.use('/api/checkout', checkoutRoutes);

// Mount social auth routes (Instagram/Facebook)
app.use('/api/social', socialAuthRoutes);

// Mount widget management routes
app.use('/api/widgets', widgetsRoutes);

// Mount public widget feed route
app.use('/api/widget', widgetFeedRoutes);

// Admin routes
app.get('/admin', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'admin', 'login.html'));
});

app.get('/admin/dashboard', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'admin', 'dashboard.html'));
});

app.get('/admin/payment-settings', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'admin', 'payment-settings.html'));
});

// Customer dashboard
app.get('/dashboard', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'dashboard', 'index.html'));
});

// Root route
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Health check endpoint for deployment platforms
app.get('/health', (req, res) => {
    res.status(200).json({ status: 'ok' });
});

// Public config endpoint to provide Supabase credentials to client
app.get('/api/config', (req, res) => {
    res.json({
        supabaseUrl: process.env.SUPABASE_URL || '',
        supabaseAnonKey: process.env.SUPABASE_ANON_KEY || ''
    });
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
