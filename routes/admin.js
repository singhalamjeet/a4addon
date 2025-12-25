const express = require('express');
const router = express.Router();
const supabase = require('../config/supabase');
const { supabaseAdmin } = require('../config/supabase');
const { authenticateUser, requireAdmin } = require('../middleware/auth');

// Apply authentication and admin check to all routes
router.use(authenticateUser);
router.use(requireAdmin);

// Get all users
router.get('/users', async (req, res) => {
    try {
        if (!supabase) {
            return res.status(503).json({ error: 'Supabase not configured' });
        }

        // Get list of all authenticated users
        const { data: { users }, error } = await supabase.auth.admin.listUsers();

        if (error) {
            console.error('Error fetching users:', error);
            return res.status(500).json({ error: 'Failed to fetch users' });
        }

        // Return user data (excluding sensitive info)
        const sanitizedUsers = users.map(user => ({
            id: user.id,
            email: user.email,
            created_at: user.created_at,
            last_sign_in_at: user.last_sign_in_at,
            app_metadata: user.app_metadata,
            user_metadata: user.user_metadata
        }));

        res.json({ users: sanitizedUsers });
    } catch (error) {
        console.error('Admin users error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Get all subscription plans
router.get('/plans', async (req, res) => {
    try {
        if (!supabase) {
            return res.status(503).json({ error: 'Supabase not configured' });
        }

        const { data, error } = await supabase
            .from('subscription_plans')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Error fetching plans:', error);
            return res.status(500).json({ error: 'Failed to fetch plans' });
        }

        res.json({ plans: data || [] });
    } catch (error) {
        console.error('Admin plans error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Create new subscription plan
router.post('/plans', async (req, res) => {
    try {
        if (!supabase) {
            return res.status(503).json({ error: 'Supabase not configured' });
        }

        const { name, price, features, active } = req.body;

        // Validate required fields
        if (!name || price === undefined) {
            return res.status(400).json({ error: 'Name and price are required' });
        }

        const { data, error } = await supabase
            .from('subscription_plans')
            .insert([{
                name,
                price: parseFloat(price),
                features: features || [],
                active: active !== undefined ? active : true
            }])
            .select()
            .single();

        if (error) {
            console.error('Error creating plan:', error);
            return res.status(500).json({ error: 'Failed to create plan' });
        }

        res.status(201).json({ plan: data });
    } catch (error) {
        console.error('Admin create plan error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Update subscription plan
router.put('/plans/:id', async (req, res) => {
    try {
        if (!supabase) {
            return res.status(503).json({ error: 'Supabase not configured' });
        }

        const { id } = req.params;
        const { name, price, features, active } = req.body;

        const updateData = { updated_at: new Date().toISOString() };
        if (name !== undefined) updateData.name = name;
        if (price !== undefined) updateData.price = parseFloat(price);
        if (features !== undefined) updateData.features = features;
        if (active !== undefined) updateData.active = active;

        const { data, error } = await supabase
            .from('subscription_plans')
            .update(updateData)
            .eq('id', id)
            .select()
            .single();

        if (error) {
            console.error('Error updating plan:', error);
            return res.status(500).json({ error: 'Failed to update plan' });
        }

        if (!data) {
            return res.status(404).json({ error: 'Plan not found' });
        }

        res.json({ plan: data });
    } catch (error) {
        console.error('Admin update plan error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Delete subscription plan
router.delete('/plans/:id', async (req, res) => {
    try {
        if (!supabase) {
            return res.status(503).json({ error: 'Supabase not configured' });
        }

        const { id } = req.params;

        const { error } = await supabase
            .from('subscription_plans')
            .delete()
            .eq('id', id);

        if (error) {
            console.error('Error deleting plan:', error);
            return res.status(500).json({ error: 'Failed to delete plan' });
        }

        res.json({ message: 'Plan deleted successfully' });
    } catch (error) {
        console.error('Admin delete plan error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

module.exports = router;
