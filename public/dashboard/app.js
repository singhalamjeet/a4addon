// Customer Dashboard JavaScript
let currentWidget = null;
let widgets = [];

// Check auth on load
(async () => {
    const session = await getSession();
    if (!session) {
        window.location.href = '/login'; // Changed from /admin to /login
        return;
    }

    // Store token for API calls
    if (session.access_token) {
        localStorage.setItem('supabase_token', session.access_token);
    }

    // Display user email
    const userEmailEl = document.getElementById('userEmail');
    if (userEmailEl && session.user) {
        userEmailEl.textContent = session.user.email || '';
    }

    // Load widgets
    loadWidgets();
})();

// Logout
document.getElementById('logoutBtn')?.addEventListener('click', async () => {
    if (supabaseClient) {
        await supabaseClient.auth.signOut();
    }
    localStorage.removeItem('supabase_token');
    window.location.href = '/login';
});

// Load user's widgets
async function loadWidgets() {
    try {
        const data = await apiCall('/api/widgets');
        widgets = data.widgets || [];

        if (widgets.length === 0) {
            document.getElementById('emptyState').style.display = 'flex';
            document.getElementById('widgetsGrid').style.display = 'none';
        } else {
            document.getElementById('emptyState').style.display = 'none';
            document.getElementById('widgetsGrid').style.display = 'grid';
            renderWidgets();
        }
    } catch (error) {
        console.error('Error loading widgets:', error);
        showToast('Failed to load widgets', 'error');
    }
}

// Render widgets grid
function renderWidgets() {
    const grid = document.getElementById('widgetsGrid');
    grid.innerHTML = widgets.map(widget => `
        <div class="widget-card" data-id="${widget.id}">
            <div class="widget-card-header">
                <h3>${escapeHtml(widget.name)}</h3>
                <span class="widget-status ${widget.is_active ? 'active' : 'inactive'}">
                    ${widget.is_active ? '● Active' : '○ Inactive'}
                </span>
            </div>
            <div class="widget-card-body">
                <p class="widget-type">${formatWidgetType(widget.widget_type)}</p>
                <p class="widget-meta">
                    <span>📐 ${widget.layout}</span>
                    <span>🎨 ${widget.theme}</span>
                    <span>📊 ${widget.post_count} posts</span>
                </p>
                <p class="widget-date">Created ${formatDate(widget.created_at)}</p>
            </div>
            <div class="widget-card-actions">
                <button class="btn btn-outline" onclick="openWidgetDetails('${widget.id}')">
                    Manage
                </button>
            </div>
        </div>
    `).join('');
}

// Create widget button
document.getElementById('createWidgetBtn')?.addEventListener('click', () => {
    currentWidget = null;
    document.getElementById('modalTitle').textContent = 'Create Instagram Widget';
    document.getElementById('saveWidgetBtnText').textContent = 'Create Widget';
    document.getElementById('widgetForm').reset();
    document.getElementById('widgetModal').classList.add('show');
});

// Widget form submission
document.getElementById('widgetForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();

    const widgetData = {
        name: document.getElementById('widgetName').value.trim(),
        widget_type: document.getElementById('widgetType').value,
        layout: document.getElementById('widgetLayout').value,
        theme: document.getElementById('widgetTheme').value,
        post_count: parseInt(document.getElementById('widgetPostCount').value),
    };

    try {
        if (currentWidget) {
            // Update
            await apiCall(`/api/widgets/${currentWidget.id}`, {
                method: 'PUT',
                body: JSON.stringify(widgetData),
            });
            showToast('Widget updated successfully', 'success');
        } else {
            // Create
            await apiCall('/api/widgets', {
                method: 'POST',
                body: JSON.stringify(widgetData),
            });
            showToast('Widget created successfully', 'success');
        }

        closeWidgetModal();
        loadWidgets();
    } catch (error) {
        showToast(error.message || 'Failed to save widget', 'error');
    }
});

// Close widget modal
function closeWidgetModal() {
    document.getElementById('widgetModal').classList.remove('show');
}

// Open widget details
async function openWidgetDetails(widgetId) {
    currentWidget = widgets.find(w => w.id === widgetId);
    if (!currentWidget) return;

    document.getElementById('detailsWidgetName').textContent = currentWidget.name;
    document.getElementById('widgetDetailsModal').classList.add('show');

    // Set embed code
    const embedCode = `<script src="${window.location.origin}/widget.js" data-widget-id="${currentWidget.id}"></script>`;
    document.getElementById('embedCode').textContent = embedCode;

    const previewUrl = `${window.location.origin}/api/widget/${currentWidget.id}/feed`;
    document.getElementById('previewUrl').textContent = previewUrl;
    document.getElementById('previewUrl').href = previewUrl;

    // Set settings
    document.getElementById('settingsLayout').textContent = currentWidget.layout;
    document.getElementById('settingsTheme').textContent = currentWidget.theme;
    document.getElementById('settingsPostCount').textContent = currentWidget.post_count;
    document.getElementById('settingsStatus').textContent = currentWidget.is_active ? 'Active' : 'Inactive';

    // Load posts if personal type
    if (currentWidget.widget_type === 'instagram_personal') {
        loadWidgetPosts();
    }

    // Switch to posts tab
    switchTab('posts');
}

// Load widget posts (personal mode)
async function loadWidgetPosts() {
    // For now, show empty state - posts will be added via API
    const postsList = document.getElementById('postsList');
    postsList.innerHTML = '<p class="empty-text">No posts added yet. Add Instagram post URLs above.</p>';
}

// Add Instagram post
document.getElementById('addPostBtn')?.addEventListener('click', async () => {
    const postUrl = document.getElementById('postUrlInput').value.trim();

    if (!postUrl) {
        showToast('Please enter an Instagram URL', 'error');
        return;
    }

    if (!currentWidget) return;

    try {
        await apiCall(`/api/widgets/${currentWidget.id}/embeds`, {
            method: 'POST',
            body: JSON.stringify({ post_url: postUrl }),
        });

        showToast('Post added successfully', 'success');
        document.getElementById('postUrlInput').value = '';
        loadWidgetPosts();
    } catch (error) {
        showToast(error.message || 'Failed to add post', 'error');
    }
});

// Close details modal
function closeDetailsModal() {
    document.getElementById('widgetDetailsModal').classList.remove('show');
    currentWidget = null;
}

// Tab switching
document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        const tab = btn.getAttribute('data-tab');
        switchTab(tab);
    });
});

function switchTab(tabName) {
    // Update buttons
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelector(`[data-tab="${tabName}"]`)?.classList.add('active');

    // Update content
    document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
    document.getElementById(`${tabName}Tab`)?.classList.add('active');
}

// Copy embed code
function copyEmbedCode() {
    const code = document.getElementById('embedCode').textContent;
    navigator.clipboard.writeText(code).then(() => {
        showToast('Embed code copied to clipboard', 'success');
    }).catch(() => {
        showToast('Failed to copy', 'error');
    });
}

// Delete widget
async function deleteWidget() {
    if (!currentWidget) return;

    if (!confirm(`Delete widget "${currentWidget.name}"? This action cannot be undone.`)) {
        return;
    }

    try {
        await apiCall(`/api/widgets/${currentWidget.id}`, {
            method: 'DELETE',
        });

        showToast('Widget deleted successfully', 'success');
        closeDetailsModal();
        loadWidgets();
    } catch (error) {
        showToast(error.message || 'Failed to delete widget', 'error');
    }
}

// Utility functions
function formatWidgetType(type) {
    const types = {
        'instagram_business': '📸 Instagram Business',
        'instagram_personal': '📱 Instagram Personal',
    };
    return types[type] || type;
}

function formatDate(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const diffDays = Math.floor((now - date) / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    return date.toLocaleDateString();
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}
