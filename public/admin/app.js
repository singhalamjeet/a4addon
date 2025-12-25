// Initialize Supabase client
const SUPABASE_URL = window.location.hostname === 'localhost'
    ? 'YOUR_SUPABASE_URL'
    : 'YOUR_SUPABASE_URL'; // Will be set via environment

const SUPABASE_ANON_KEY = window.location.hostname === 'localhost'
    ? 'YOUR_SUPABASE_KEY'
    : 'YOUR_SUPABASE_KEY'; // Will be set via environment

// Note: For production, these should be embedded during build or fetched from config endpoint
// For now, we'll detect them from the meta tags or use a config endpoint
let supabaseClient = null;

// Initialize Supabase
async function initSupabase() {
    try {
        // Try to get config from a meta endpoint
        const response = await fetch('/api/supabase-status');
        const data = await response.json();

        // For client-side, we need the public URL and anon key
        // These should be safe to expose as they're public credentials
        // In production, you might want to add these as meta tags in your HTML

        // For now, we'll initialize with placeholder
        // The actual initialization should use your Supabase project credentials
        const url = document.querySelector('meta[name="supabase-url"]')?.content;
        const key = document.querySelector('meta[name="supabase-key"]')?.content;

        if (url && key) {
            supabaseClient = supabase.createClient(url, key);
        } else {
            console.warn('Supabase credentials not found in meta tags');
        }
    } catch (error) {
        console.error('Failed to initialize Supabase:', error);
    }
}

// Get current session
async function getSession() {
    if (!supabaseClient) {
        // Try to get from localStorage (set during login)
        const session = localStorage.getItem('supabase_session');
        return session ? JSON.parse(session) : null;
    }

    const { data: { session } } = await supabaseClient.auth.getSession();
    return session;
}

// Login function
async function login(email, password) {
    try {
        // Use fetch to call Supabase auth directly
        const response = await fetch(`https://${window.SUPABASE_PROJECT_REF}.supabase.co/auth/v1/token?grant_type=password`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'apikey': window.SUPABASE_ANON_KEY
            },
            body: JSON.stringify({ email, password })
        });

        const data = await response.json();

        if (data.access_token) {
            // Store session
            localStorage.setItem('supabase_session', JSON.stringify(data));
            localStorage.setItem('supabase_token', data.access_token);
            return { success: true };
        } else {
            return { success: false, error: data.error_description || 'Login failed' };
        }
    } catch (error) {
        console.error('Login error:', error);
        return { success: false, error: error.message };
    }
}

// Logout function
async function logout() {
    try {
        localStorage.removeItem('supabase_session');
        localStorage.removeItem('supabase_token');
        window.location.href = '/admin';
    } catch (error) {
        console.error('Logout error:', error);
    }
}

// Get auth token for API calls
function getAuthToken() {
    return localStorage.getItem('supabase_token');
}

// API helper function
async function apiCall(endpoint, options = {}) {
    const token = getAuthToken();

    if (!token) {
        throw new Error('Not authenticated');
    }

    const response = await fetch(endpoint, {
        ...options,
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
            ...options.headers
        }
    });

    if (response.status === 401) {
        // Token expired or invalid
        logout();
        throw new Error('Session expired. Please login again.');
    }

    const data = await response.json();

    if (!response.ok) {
        throw new Error(data.error || 'Request failed');
    }

    return data;
}

// Fetch all users
async function fetchUsers() {
    return await apiCall('/api/admin/users');
}

// Fetch all plans
async function fetchPlans() {
    return await apiCall('/api/admin/plans');
}

// Create plan
async function createPlan(planData) {
    return await apiCall('/api/admin/plans', {
        method: 'POST',
        body: JSON.stringify(planData)
    });
}

// Update plan
async function updatePlan(id, planData) {
    return await apiCall(`/api/admin/plans/${id}`, {
        method: 'PUT',
        body: JSON.stringify(planData)
    });
}

// Delete plan
async function deletePlan(id) {
    return await apiCall(`/api/admin/plans/${id}`, {
        method: 'DELETE'
    });
}

// Show toast notification
function showToast(message, type = 'success') {
    const toast = document.getElementById('toast');
    if (toast) {
        toast.textContent = message;
        toast.className = `toast toast-${type} show`;

        setTimeout(() => {
            toast.classList.remove('show');
        }, 3000);
    }
}

// Initialize on load
if (typeof window !== 'undefined') {
    // Set Supabase config from meta tags if available
    window.addEventListener('DOMContentLoaded', () => {
        const urlMeta = document.querySelector('meta[name="supabase-url"]');
        const keyMeta = document.querySelector('meta[name="supabase-key"]');

        if (urlMeta && keyMeta) {
            window.SUPABASE_PROJECT_REF = new URL(urlMeta.content).hostname.split('.')[0];
            window.SUPABASE_ANON_KEY = keyMeta.content;
        }
    });
}
