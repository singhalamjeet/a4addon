// Initialize Supabase client
let supabaseClient = null;
let supabaseConfig = null;

// Fetch Supabase config from server
async function initSupabase() {
    try {
        const response = await fetch('/api/config');
        supabaseConfig = await response.json();

        if (supabaseConfig.supabaseUrl && supabaseConfig.supabaseAnonKey) {
            const { createClient } = supabase;
            supabaseClient = createClient(supabaseConfig.supabaseUrl, supabaseConfig.supabaseAnonKey);
            return true;
        } else {
            console.error('Supabase credentials not configured');
            return false;
        }
    } catch (error) {
        console.error('Failed to initialize Supabase:', error);
        return false;
    }
}

// Get current session
async function getSession() {
    if (!supabaseClient) {
        await initSupabase();
    }

    if (!supabaseClient) {
        return null;
    }

    const { data: { session } } = await supabaseClient.auth.getSession();
    return session;
}

// Login function
async function login(email, password) {
    try {
        if (!supabaseClient) {
            await initSupabase();
        }

        if (!supabaseClient) {
            return { success: false, error: 'Supabase not configured' };
        }

        const { data, error } = await supabaseClient.auth.signInWithPassword({
            email,
            password
        });

        if (error) {
            return { success: false, error: error.message };
        }

        if (data.session) {
            // Store session for API calls
            localStorage.setItem('supabase_token', data.session.access_token);
            return { success: true };
        }

        return { success: false, error: 'Login failed' };
    } catch (error) {
        console.error('Login error:', error);
        return { success: false, error: error.message };
    }
}

// Logout function
async function logout() {
    try {
        if (supabaseClient) {
            await supabaseClient.auth.signOut();
        }
        localStorage.removeItem('supabase_token');
        window.location.href = '/admin';
    } catch (error) {
        console.error('Logout error:', error);
        localStorage.removeItem('supabase_token');
        window.location.href = '/admin';
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

    if (response.status === 401 || response.status === 403) {
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

// Auto-initialize on load
if (typeof window !== 'undefined') {
    window.addEventListener('DOMContentLoaded', () => {
        initSupabase();
    });
}
