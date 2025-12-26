const Stripe = require('stripe');
const supabase = require('../config/supabase');
const { supabaseAdmin } = require('../config/supabase');

let stripeClient = null;

// Initialize Stripe client with settings from database
async function getStripeClient() {
    if (stripeClient) return stripeClient;

    try {
        if (!supabaseAdmin) {
            console.error('Supabase admin not configured');
            return null;
        }

        const { data, error } = await supabaseAdmin
            .from('payment_settings')
            .select('*')
            .eq('gateway', 'stripe')
            .eq('is_enabled', true)
            .single();

        if (error || !data || !data.secret_key) {
            console.warn('Stripe not configured or not enabled');
            return null;
        }

        stripeClient = new Stripe(data.secret_key, {
            apiVersion: '2023-10-16',
        });

        return stripeClient;
    } catch (error) {
        console.error('Error initializing Stripe:', error);
        return null;
    }
}

// Create checkout session
async function createCheckoutSession({ planId, userId, customerEmail, successUrl, cancelUrl }) {
    try {
        const stripe = await getStripeClient();
        if (!stripe) {
            throw new Error('Stripe not configured');
        }

        // Get plan details
        const { data: plan, error: planError } = await supabaseAdmin
            .from('subscription_plans')
            .select('*')
            .eq('id', planId)
            .single();

        if (planError || !plan) {
            throw new Error('Plan not found');
        }

        // Create checkout session
        const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            line_items: [
                {
                    price_data: {
                        currency: 'usd',
                        product_data: {
                            name: plan.name,
                            description: `Subscription to ${plan.name}`,
                        },
                        unit_amount: Math.round(plan.price * 100), // Convert to cents
                    },
                    quantity: 1,
                },
            ],
            mode: 'payment',
            customer_email: customerEmail,
            success_url: successUrl,
            cancel_url: cancelUrl,
            metadata: {
                plan_id: planId,
                user_id: userId || '',
            },
        });

        return { success: true, sessionId: session.id, url: session.url };
    } catch (error) {
        console.error('Error creating Stripe checkout session:', error);
        return { success: false, error: error.message };
    }
}

// Verify webhook signature
function verifyWebhookSignature(payload, signature, webhookSecret) {
    try {
        const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'dummy');
        const event = stripe.webhooks.constructEvent(payload, signature, webhookSecret);
        return { success: true, event };
    } catch (error) {
        console.error('Webhook signature verification failed:', error);
        return { success: false, error: error.message };
    }
}

// Test Stripe connection
async function testConnection(secretKey) {
    try {
        const stripe = new Stripe(secretKey, {
            apiVersion: '2023-10-16',
        });

        // Try to retrieve account info
        const account = await stripe.accounts.retrieve();
        return { success: true, accountId: account.id };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

// Reset client (call when settings change)
function resetClient() {
    stripeClient = null;
}

module.exports = {
    getStripeClient,
    createCheckoutSession,
    verifyWebhookSignature,
    testConnection,
    resetClient,
};
