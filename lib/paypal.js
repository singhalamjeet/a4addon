const paypal = require('@paypal/checkout-server-sdk');
const { supabaseAdmin } = require('../config/supabase');

let paypalClient = null;

// Initialize PayPal client
async function getPayPalClient() {
    if (paypalClient) return paypalClient;

    try {
        if (!supabaseAdmin) {
            console.error('Supabase admin not configured');
            return null;
        }

        const { data, error } = await supabaseAdmin
            .from('payment_settings')
            .select('*')
            .eq('gateway', 'paypal')
            .eq('is_enabled', true)
            .single();

        if (error || !data || !data.public_key || !data.secret_key) {
            console.warn('PayPal not configured or not enabled');
            return null;
        }

        // Determine environment
        const environment = data.test_mode
            ? new paypal.core.SandboxEnvironment(data.public_key, data.secret_key)
            : new paypal.core.LiveEnvironment(data.public_key, data.secret_key);

        paypalClient = new paypal.core.PayPalHttpClient(environment);
        return paypalClient;
    } catch (error) {
        console.error('Error initializing PayPal:', error);
        return null;
    }
}

// Create order
async function createOrder({ planId, userId, returnUrl, cancelUrl }) {
    try {
        const client = await getPayPalClient();
        if (!client) {
            throw new Error('PayPal not configured');
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

        const request = new paypal.orders.OrdersCreateRequest();
        request.prefer('return=representation');
        request.requestBody({
            intent: 'CAPTURE',
            application_context: {
                return_url: returnUrl,
                cancel_url: cancelUrl,
                brand_name: 'A4 Addon',
                user_action: 'PAY_NOW',
            },
            purchase_units: [
                {
                    description: `Subscription to ${plan.name}`,
                    amount: {
                        currency_code: 'USD',
                        value: plan.price.toFixed(2),
                    },
                    custom_id: JSON.stringify({
                        plan_id: planId,
                        user_id: userId || '',
                    }),
                },
            ],
        });

        const response = await client.execute(request);
        const approveLink = response.result.links.find(link => link.rel === 'approve');

        return {
            success: true,
            orderId: response.result.id,
            approveUrl: approveLink ? approveLink.href : null,
        };
    } catch (error) {
        console.error('Error creating PayPal order:', error);
        return { success: false, error: error.message };
    }
}

// Capture order
async function captureOrder(orderId) {
    try {
        const client = await getPayPalClient();
        if (!client) {
            throw new Error('PayPal not configured');
        }

        const request = new paypal.orders.OrdersCaptureRequest(orderId);
        request.requestBody({});

        const response = await client.execute(request);
        return { success: true, order: response.result };
    } catch (error) {
        console.error('Error capturing PayPal order:', error);
        return { success: false, error: error.message };
    }
}

// Test PayPal connection
async function testConnection(clientId, clientSecret, testMode = true) {
    try {
        const environment = testMode
            ? new paypal.core.SandboxEnvironment(clientId, clientSecret)
            : new paypal.core.LiveEnvironment(clientId, clientSecret);

        const client = new paypal.core.PayPalHttpClient(environment);

        // Try to create a minimal order to test credentials
        const request = new paypal.orders.OrdersCreateRequest();
        request.requestBody({
            intent: 'CAPTURE',
            purchase_units: [{
                amount: {
                    currency_code: 'USD',
                    value: '1.00'
                }
            }]
        });

        await client.execute(request);
        return { success: true };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

// Reset client
function resetClient() {
    paypalClient = null;
}

module.exports = {
    getPayPalClient,
    createOrder,
    captureOrder,
    testConnection,
    resetClient,
};
