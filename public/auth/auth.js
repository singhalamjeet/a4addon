// Authentication JavaScript for signup/login pages
let supabaseClient = null;

// Initialize Supabase and set up auth
async function initAuth(mode) {
    try {
        // Fetch Supabase config
        const response = await fetch('/api/config');
        const config = await response.json();

        if (config.supabaseUrl && config.supabaseAnonKey) {
            const { createClient } = supabase;
            supabaseClient = createClient(config.supabaseUrl, config.supabaseAnonKey);
        } else {
            showError('Configuration error. Please try again later.');
            return;
        }

        // Set up event listeners based on mode
        if (mode === 'signup') {
            setupSignup();
        } else if (mode === 'login') {
            setupLogin();
        }

        // Set up social login buttons
        setupSocialLogin();

        // Check if user is already logged in
        const { data: { session } } = await supabaseClient.auth.getSession();
        if (session) {
            window.location.href = '/dashboard';
        }
    } catch (error) {
        console.error('Init error:', error);
        showError('Failed to initialize. Please refresh the page.');
    }
}

// Setup signup form
function setupSignup() {
    const form = document.getElementById('signupForm');
    form?.addEventListener('submit', async (e) => {
        e.preventDefault();

        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        const btn = document.getElementById('signupBtn');

        btn.disabled = true;
        btn.innerHTML = '<span>Creating account...</span>';

        try {
            const { data, error } = await supabaseClient.auth.signUp({
                email,
                password,
                options: {
                    emailRedirectTo: `${window.location.origin}/dashboard`,
                },
            });

            if (error) throw error;

            showSuccess('Account created! Please check your email to verify.');
            setTimeout(() => {
                window.location.href = '/login';
            }, 2000);
        } catch (error) {
            showError(error.message || 'Failed to create account');
            btn.disabled = false;
            btn.innerHTML = '<span>Create Account</span>';
        }
    });
}

// Setup login form
function setupLogin() {
    const form = document.getElementById('loginForm');
    form?.addEventListener('submit', async (e) => {
        e.preventDefault();

        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        const btn = document.getElementById('loginBtn');

        btn.disabled = true;
        btn.innerHTML = '<span>Signing in...</span>';

        try {
            const { data, error } = await supabaseClient.auth.signInWithPassword({
                email,
                password,
            });

            if (error) throw error;

            window.location.href = '/dashboard';
        } catch (error) {
            showError(error.message || 'Failed to sign in');
            btn.disabled = false;
            btn.innerHTML = '<span>Sign In</span>';
        }
    });
}

// Setup social login buttons
function setupSocialLogin() {
    const redirectTo = `${window.location.origin}/dashboard`;

    // Google
    document.getElementById('googleBtn')?.addEventListener('click', async () => {
        try {
            const { error } = await supabaseClient.auth.signInWithOAuth({
                provider: 'google',
                options: {
                    redirectTo,
                },
            });
            if (error) throw error;
        } catch (error) {
            showError('Google sign-in failed. Please configure OAuth in Supabase.');
        }
    });

    // Facebook
    document.getElementById('facebookBtn')?.addEventListener('click', async () => {
        try {
            const { error } = await supabaseClient.auth.signInWithOAuth({
                provider: 'facebook',
                options: {
                    redirectTo,
                },
            });
            if (error) throw error;
        } catch (error) {
            showError('Facebook sign-in failed. Please configure OAuth in Supabase.');
        }
    });

    // Microsoft (Azure)
    document.getElementById('microsoftBtn')?.addEventListener('click', async () => {
        try {
            const { error } = await supabaseClient.auth.signInWithOAuth({
                provider: 'azure',
                options: {
                    redirectTo,
                    scopes: 'email',
                },
            });
            if (error) throw error;
        } catch (error) {
            showError('Microsoft sign-in failed. Please configure OAuth in Supabase.');
        }
    });
}

// Show error message
function showError(message) {
    const errorDiv = document.getElementById('errorMessage');
    if (errorDiv) {
        errorDiv.textContent = message;
        errorDiv.style.display = 'block';
        errorDiv.className = 'error-message error-visible';

        setTimeout(() => {
            errorDiv.className = 'error-message';
        }, 5000);
    }
}

// Show success message
function showSuccess(message) {
    const errorDiv = document.getElementById('errorMessage');
    if (errorDiv) {
        errorDiv.textContent = message;
        errorDiv.style.display = 'block';
        errorDiv.className = 'error-message success-visible';
    }
}
