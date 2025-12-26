const express = require('express');
const router = express.Router();
const { supabaseAdmin } = require('../config/supabase');
const { authenticateUser, requireAdmin } = require('../middleware/auth');
const stripeLib = require('../lib/stripe');
const paypalLib = require('../lib/paypal');

// Apply authentication and admin check to all routes
router.use(authenticateUser);
router.use(requireAdmin);

// Get all payment gateway settings
router.get('/', async (req, res) => {
    try {
        if (!supabaseAdmin) {
            return res.status(503).json({ error: 'Supabase admin not configured' });
        }

        const { data, error } = await supabaseAdmin
            .from('payment_settings')
            .select('id, gateway, is_enabled, test_mode, public_key, created_at, updated_at')
            .order('gateway');

        if (error) {
            console.error('Error fetching payment settings:', error);
            return res.status(500).json({ error: 'Failed to fetch payment settings' });
        }

        res.json({ settings: data || [] });
    } catch (error) {
        console.error('Payment settings error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Update payment gateway settings
router.put('/:gateway', async (req, res) => {
    try {
        if (!supabaseAdmin) {
            return res.status(503).json({ error: 'Supabase admin not configured' });
        }

        const { gateway } = req.params;
        const { is_enabled, test_mode, public_key, secret_key, webhook_secret } = req.body;

        if (!['stripe', 'paypal'].includes(gateway)) {
            return res.status(400).json({ error: 'Invalid gateway' });
        }

        const updateData = {
            updated_at: new Date().toISOString(),
        };

        if (is_enabled !== undefined) updateData.is_enabled = is_enabled;
        if (test_mode !== undefined) updateData.test_mode = test_mode;
        if (public_key !== undefined) updateData.public_key = public_key;
        if (secret_key !== undefined) updateData.secret_key = secret_key;
        if (webhook_secret !== undefined) updateData.webhook_secret = webhook_secret;

        // Upsert (insert or update)
        const { data, error } = await supabaseAdmin
            .from('payment_settings')
            .upsert({ gateway, ...updateData }, { onConflict: 'gateway' })
            .select('id, gateway, is_enabled, test_mode, public_key, created_at, updated_at')
            .single();

        if (error) {
            console.error('Error updating payment settings:', error);
            return res.status(500).json({ error: 'Failed to update payment settings' });
        }

        // Reset client so it picks up new settings
        if (gateway === 'stripe') {
            stripeLib.resetClient();
        } else if (gateway === 'paypal') {
            paypalLib.resetClient();
        }

        res.json({ setting: data });
    } catch (error) {
        console.error('Update payment settings error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Test payment gateway connection
router.post('/:gateway/test', async (req, res) => {
    try {
        const { gateway } = req.params;
        const { secret_key, public_key, test_mode } = req.body;

        if (!['stripe', 'paypal'].includes(gateway)) {
            return res.status(400).json({ error: 'Invalid gateway' });
        }

        let result;
        if (gateway === 'stripe') {
            if (!secret_key) {
                return res.status(400).json({ error: 'Secret key is required' });
            }
            result = await stripeLib.testConnection(secret_key);
        } else if (gateway === 'paypal') {
            if (!public_key || !secret_key) {
                return res.status(400).json({ error: 'Client ID and secret are required' });
            }
            result = await paypalLib.testConnection(public_key, secret_key, test_mode);
        }

        if (result.success) {
            res.json({ success: true, message: 'Connection successful', ...result });
        } else {
            res.status(400).json({ success: false, error: result.error });
        }
    } catch (error) {
        console.error('Test connection error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

module.exports = router;
