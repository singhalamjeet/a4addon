const express = require('express');
const router = express.Router();
const { supabaseAdmin } = require('../config/supabase');
const stripeLib = require('../lib/stripe');
const paypalLib = require('../lib/paypal');

// Create Stripe checkout session
router.post('/stripe', async (req, res) => {
    try {
        const { planId, customerEmail } = req.body;

        if (!planId || !customerEmail) {
            return res.status(400).json({ error: 'Plan ID and customer email are required' });
        }

        const baseUrl = `${req.protocol}://${req.get('host')}`;
        const result = await stripeLib.createCheckoutSession({
            planId,
            userId: req.body.userId,
            customerEmail,
            successUrl: `${baseUrl}/success?session_id={CHECKOUT_SESSION_ID}`,
            cancelUrl: `${baseUrl}/cancel`,
        });

        if (result.success) {
            res.json({ success: true, sessionId: result.sessionId, url: result.url });
        } else {
            res.status(400).json({ success: false, error: result.error });
        }
    } catch (error) {
        console.error('Stripe checkout error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Create PayPal order
router.post('/paypal', async (req, res) => {
    try {
        const { planId } = req.body;

        if (!planId) {
            return res.status(400).json({ error: 'Plan ID is required' });
        }

        const baseUrl = `${req.protocol}://${req.get('host')}`;
        const result = await paypalLib.createOrder({
            planId,
            userId: req.body.userId,
            returnUrl: `${baseUrl}/api/checkout/paypal/capture`,
            cancelUrl: `${baseUrl}/cancel`,
        });

        if (result.success) {
            res.json({ success: true, orderId: result.orderId, approveUrl: result.approveUrl });
        } else {
            res.status(400).json({ success: false, error: result.error });
        }
    } catch (error) {
        console.error('PayPal checkout error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Capture PayPal order (after customer approves)
router.get('/paypal/capture', async (req, res) => {
    try {
        const { token } = req.query; // PayPal returns token as order ID

        if (!token) {
            return res.redirect('/cancel');
        }

        const result = await paypalLib.captureOrder(token);

        if (result.success && result.order) {
            // Extract metadata from custom_id
            const customData = JSON.parse(result.order.purchase_units[0].custom_id || '{}');

            // Record purchase
            await supabaseAdmin.from('customer_purchases').insert({
                user_id: customData.user_id || null,
                plan_id: customData.plan_id,
                gateway: 'paypal',
                transaction_id: result.order.id,
                amount: parseFloat(result.order.purchase_units[0].amount.value),
                currency: result.order.purchase_units[0].amount.currency_code,
                status: 'completed',
                customer_email: result.order.payer.email_address,
                metadata: result.order,
            });

            res.redirect(`/success?order_id=${result.order.id}`);
        } else {
            res.redirect('/cancel');
        }
    } catch (error) {
        console.error('PayPal capture error:', error);
        res.redirect('/cancel');
    }
});

// Stripe webhook
router.post('/webhooks/stripe', express.raw({ type: 'application/json' }), async (req, res) => {
    try {
        const signature = req.headers['stripe-signature'];

        // Get webhook secret from database
        const { data: settings } = await supabaseAdmin
            .from('payment_settings')
            .select('webhook_secret')
            .eq('gateway', 'stripe')
            .single();

        if (!settings || !settings.webhook_secret) {
            return res.status(400).json({ error: 'Webhook secret not configured' });
        }

        const result = stripeLib.verifyWebhookSignature(
            req.body,
            signature,
            settings.webhook_secret
        );

        if (!result.success) {
            return res.status(400).json({ error: 'Invalid signature' });
        }

        const event = result.event;

        // Handle the event
        if (event.type === 'checkout.session.completed') {
            const session = event.data.object;

            // Record purchase
            await supabaseAdmin.from('customer_purchases').insert({
                user_id: session.metadata.user_id || null,
                plan_id: session.metadata.plan_id,
                gateway: 'stripe',
                transaction_id: session.id,
                amount: session.amount_total / 100,
                currency: session.currency,
                status: 'completed',
                customer_email: session.customer_email,
                metadata: session,
            });
        }

        res.json({ received: true });
    } catch (error) {
        console.error('Stripe webhook error:', error);
        res.status(500).json({ error: 'Webhook processing failed' });
    }
});

module.exports = router;
