// Dashboard functionality
let currentSection = 'users';
let currentPlanId = null;

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

    // Load initial data
    loadUsers();
    loadPlans();
})();

// Navigation
document.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', (e) => {
        e.preventDefault();
        const section = item.dataset.section;
        switchSection(section);
    });
});

function switchSection(section) {
    currentSection = section;

    // Update nav items
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.toggle('active', item.dataset.section === section);
    });

    // Update content sections
    document.querySelectorAll('.content-section').forEach(sec => {
        sec.classList.toggle('active', sec.id === `${section}Section`);
    });
}

// Logout
document.getElementById('logoutBtn')?.addEventListener('click', logout);

// ===== USERS SECTION =====
async function loadUsers() {
    const container = document.getElementById('usersTableContainer');
    try {
        container.innerHTML = '<div class="loading">Loading users...</div>';

        const data = await fetchUsers();
        const users = data.users || [];

        // Update stats
        document.getElementById('totalUsers').textContent = users.length;

        if (users.length === 0) {
            container.innerHTML = '<div class="empty-state">No users found</div>';
            return;
        }

        // Create table
        const table = document.createElement('table');
        table.className = 'data-table';
        table.innerHTML = `
            <thead>
                <tr>
                    <th>Email</th>
                    <th>Created At</th>
                    <th>Last Sign In</th>
                    <th>Status</th>
                </tr>
            </thead>
            <tbody>
                ${users.map(user => `
                    <tr>
                        <td><strong>${user.email}</strong></td>
                        <td>${new Date(user.created_at).toLocaleDateString()}</td>
                        <td>${user.last_sign_in_at ? new Date(user.last_sign_in_at).toLocaleDateString() : 'Never'}</td>
                        <td><span class="badge badge-success">Active</span></td>
                    </tr>
                `).join('')}
            </tbody>
        `;

        container.innerHTML = '';
        container.appendChild(table);
    } catch (error) {
        console.error('Error loading users:', error);
        container.innerHTML = `<div class="error-state">Failed to load users: ${error.message}</div>`;
    }
}

document.getElementById('refreshUsersBtn')?.addEventListener('click', loadUsers);

// ===== PLANS SECTION =====
async function loadPlans() {
    const container = document.getElementById('plansGrid');
    try {
        container.innerHTML = '<div class="loading">Loading plans...</div>';

        const data = await fetchPlans();
        const plans = data.plans || [];

        // Update stats
        document.getElementById('totalPlans').textContent = plans.filter(p => p.active).length;

        if (plans.length === 0) {
            container.innerHTML = '<div class="empty-state">No plans found. Create your first plan!</div>';
            return;
        }

        // Create plan cards
        container.innerHTML = plans.map(plan => createPlanCard(plan)).join('');

        // Attach event listeners
        container.querySelectorAll('.edit-plan-btn').forEach(btn => {
            btn.addEventListener('click', () => editPlan(btn.dataset.planId));
        });

        container.querySelectorAll('.delete-plan-btn').forEach(btn => {
            btn.addEventListener('click', () => deletePlanConfirm(btn.dataset.planId, btn.dataset.planName));
        });
    } catch (error) {
        console.error('Error loading plans:', error);
        container.innerHTML = `<div class="error-state">Failed to load plans: ${error.message}</div>`;
    }
}

function createPlanCard(plan) {
    const features = Array.isArray(plan.features) ? plan.features : [];
    return `
        <div class="plan-card ${!plan.active ? 'inactive' : ''}">
            <div class="plan-header">
                <h3>${plan.name}</h3>
                ${!plan.active ? '<span class="badge badge-inactive">Inactive</span>' : '<span class="badge badge-success">Active</span>'}
            </div>
            <div class="plan-price">$${parseFloat(plan.price).toFixed(2)}/mo</div>
            <div class="plan-features">
                ${features.length > 0 ? features.map(f => `<div class="feature">✓ ${f}</div>`).join('') : '<div class="feature-empty">No features listed</div>'}
            </div>
            <div class="plan-actions">
                <button class="btn btn-outline edit-plan-btn" data-plan-id="${plan.id}">Edit</button>
                <button class="btn btn-danger delete-plan-btn" data-plan-id="${plan.id}" data-plan-name="${plan.name}">Delete</button>
            </div>
        </div>
    `;
}

// Modal controls
const modal = document.getElementById('planModal');
const closeModalBtn = document.getElementById('closeModalBtn');
const cancelModalBtn = document.getElementById('cancelModalBtn');
const createPlanBtn = document.getElementById('createPlanBtn');
const planForm = document.getElementById('planForm');

createPlanBtn?.addEventListener('click', () => openPlanModal());
closeModalBtn?.addEventListener('click', closePlanModal);
cancelModalBtn?.addEventListener('click', closePlanModal);

window.addEventListener('click', (e) => {
    if (e.target === modal) {
        closePlanModal();
    }
});

function openPlanModal(plan = null) {
    currentPlanId = plan?.id || null;

    document.getElementById('modalTitle').textContent = plan ? 'Edit Plan' : 'Create Plan';
    document.getElementById('planId').value = plan?.id || '';
    document.getElementById('planName').value = plan?.name || '';
    document.getElementById('planPrice').value = plan?.price || '';
    document.getElementById('planActive').checked = plan?.active !== false;

    const features = Array.isArray(plan?.features) ? plan.features : [];
    document.getElementById('planFeatures').value = features.join('\n');

    modal.classList.add('show');
}

function closePlanModal() {
    modal.classList.remove('show');
    planForm.reset();
    currentPlanId = null;
}

async function editPlan(planId) {
    try {
        const data = await fetchPlans();
        const plan = data.plans.find(p => p.id === planId);
        if (plan) {
            openPlanModal(plan);
        }
    } catch (error) {
        showToast('Failed to load plan details', 'error');
    }
}

async function deletePlanConfirm(planId, planName) {
    if (!confirm(`Are you sure you want to delete "${planName}"? This action cannot be undone.`)) {
        return;
    }

    try {
        await deletePlan(planId);
        showToast('Plan deleted successfully', 'success');
        loadPlans();
    } catch (error) {
        showToast(`Failed to delete plan: ${error.message}`, 'error');
    }
}

// Form submission
planForm?.addEventListener('submit', async (e) => {
    e.preventDefault();

    const name = document.getElementById('planName').value.trim();
    const price = parseFloat(document.getElementById('planPrice').value);
    const featuresText = document.getElementById('planFeatures').value.trim();
    const active = document.getElementById('planActive').checked;

    const features = featuresText ? featuresText.split('\n').map(f => f.trim()).filter(f => f) : [];

    const planData = { name, price, features, active };

    const savePlanBtn = document.getElementById('savePlanBtn');
    savePlanBtn.disabled = true;
    savePlanBtn.textContent = 'Saving...';

    try {
        if (currentPlanId) {
            await updatePlan(currentPlanId, planData);
            showToast('Plan updated successfully', 'success');
        } else {
            await createPlan(planData);
            showToast('Plan created successfully', 'success');
        }

        closePlanModal();
        loadPlans();
    } catch (error) {
        showToast(`Failed to save plan: ${error.message}`, 'error');
    } finally {
        savePlanBtn.disabled = false;
        savePlanBtn.textContent = 'Save Plan';
    }
});
