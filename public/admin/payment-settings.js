// Payment settings page functionality
let settings = {};

// Check auth on load
(async () => {
    const session = await getSession();
    if (!session) {
        window.location.href = '/admin';
        return;
    }

    // Display admin email
    const adminEmailEl = document.getElementById('adminEmail');
    if (adminEmailEl && session.user) {
        adminEmailEl.textContent = session.user.email || '';
    }

    // Load settings
    loadPaymentSettings();
})();

// Logout
document.getElementById('logoutBtn')?.addEventListener('click', logout);

// Load all payment settings
async function loadPaymentSettings() {
    try {
        const data = await apiCall('/api/admin/payment-settings');
        settings = {};

        (data.settings || []).forEach(setting => {
            settings[setting.gateway] = setting;
            updateGatewayUI(setting.gateway, setting);
        });
    } catch (error) {
        console.error('Error loading payment settings:', error);
        showToast('Failed to load payment settings', 'error');
    }
}

// Update gateway UI with loaded settings
function updateGatewayUI(gateway, setting) {
    const prefix = gateway.charAt(0).toUpperCase() + gateway.slice(1).toLowerCase();

    // Update status
    const statusEl = document.getElementById(`${gateway}Status`);
    if (statusEl) {
        statusEl.textContent = setting.is_enabled ? 'Enabled' : 'Disabled';
        statusEl.className = `status-badge ${setting.is_enabled ? 'status-enabled' : 'status-disabled'}`;
    }

    // Update enabled toggle
    const enabledEl = document.getElementById(`${gateway}Enabled`);
    if (enabledEl) {
        enabledEl.checked = setting.is_enabled || false;
    }

    // Update test mode
    const testModeEl = document.getElementById(`${gateway}TestMode`);
    if (testModeEl) {
        testModeEl.checked = setting.test_mode !== false;
    }

    // Update public key
    const publicKeyEl = document.getElementById(`${gateway}${gateway === 'stripe' ? 'PublicKey' : 'ClientId'}`);
    if (publicKeyEl && setting.public_key) {
        publicKeyEl.value = setting.public_key;
    }
}

// Save Stripe settings
document.getElementById('stripeForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();

    const data = {
        is_enabled: document.getElementById('stripeEnabled').checked,
        test_mode: document.getElementById('stripeTestMode').checked,
        public_key: document.getElementById('stripePublicKey').value.trim(),
        secret_key: document.getElementById('stripeSecretKey').value.trim(),
        webhook_secret: document.getElementById('stripeWebhookSecret').value.trim() || null,
    };

    if (!data.public_key || !data.secret_key) {
        showToast('Please enter both Publishable and Secret keys', 'error');
        return;
    }

    try {
        const result = await apiCall('/api/admin/payment-settings/stripe', {
            method: 'PUT',
            body: JSON.stringify(data),
        });

        showToast('Stripe settings saved successfully', 'success');
        updateGatewayUI('stripe', result.setting);
    } catch (error) {
        showToast(error.message || 'Failed to save Stripe settings', 'error');
    }
});

// Save PayPal settings
document.getElementById('paypalForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();

    const data = {
        is_enabled: document.getElementById('paypalEnabled').checked,
        test_mode: document.getElementById('paypalTestMode').checked,
        public_key: document.getElementById('paypalClientId').value.trim(),
        secret_key: document.getElementById('paypalSecret').value.trim(),
    };

    if (!data.public_key || !data.secret_key) {
        showToast('Please enter both Client ID and Secret', 'error');
        return;
    }

    try {
        const result = await apiCall('/api/admin/payment-settings/paypal', {
            method: 'PUT',
            body: JSON.stringify(data),
        });

        showToast('PayPal settings saved successfully', 'success');
        updateGatewayUI('paypal', result.setting);
    } catch (error) {
        showToast(error.message || 'Failed to save PayPal settings', 'error');
    }
});

// Test Stripe connection
document.getElementById('testStripeBtn')?.addEventListener('click', async () => {
    const btn = document.getElementById('testStripeBtn');
    const secretKey = document.getElementById('stripeSecretKey').value.trim();

    if (!secretKey) {
        showToast('Please enter Secret Key first', 'error');
        return;
    }

    btn.disabled = true;
    btn.textContent = 'Testing...';

    try {
        const result = await apiCall('/api/admin/payment-settings/stripe/test', {
            method: 'POST',
            body: JSON.stringify({ secret_key: secretKey }),
        });

        if (result.success) {
            showToast('Stripe connection successful!', 'success');
        } else {
            showToast(`Connection failed: ${result.error}`, 'error');
        }
    } catch (error) {
        showToast(error.message || 'Connection test failed', 'error');
    } finally {
        btn.disabled = false;
        btn.textContent = 'Test Connection';
    }
});

// Test PayPal connection
document.getElementById('testPayPalBtn')?.addEventListener('click', async () => {
    const btn = document.getElementById('testPayPalBtn');
    const clientId = document.getElementById('paypalClientId').value.trim();
    const secret = document.getElementById('paypalSecret').value.trim();
    const testMode = document.getElementById('paypalTestMode').checked;

    if (!clientId || !secret) {
        showToast('Please enter both Client ID and Secret first', 'error');
        return;
    }

    btn.disabled = true;
    btn.textContent = 'Testing...';

    try {
        const result = await apiCall('/api/admin/payment-settings/paypal/test', {
            method: 'POST',
            body: JSON.stringify({ public_key: clientId, secret_key: secret, test_mode: testMode }),
        });

        if (result.success) {
            showToast('PayPal connection successful!', 'success');
        } else {
            showToast(`Connection failed: ${result.error}`, 'error');
        }
    } catch (error) {
        showToast(error.message || 'Connection test failed', 'error');
    } finally {
        btn.disabled = false;
        btn.textContent = 'Test Connection';
    }
});
