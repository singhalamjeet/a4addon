const express = require('express');
const router = express.Router();
const { supabaseAdmin } = require('../config/supabase');
const { authenticateUser } = require('../middleware/auth');
const { decrypt } = require('../lib/encryption');
const instagram = require('../lib/instagram');
const instagramOEmbed = require('../lib/instagram-oembed');

// Get all user's widgets
router.get('/', authenticateUser, async (req, res) => {
    try {
        const { data, error } = await supabaseAdmin
            .from('widgets')
            .select(`
                *,
                connection:social_connections(id, provider, ig_username, page_name)
            `)
            .eq('user_id', req.user.id)
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Get widgets error:', error);
            return res.status(500).json({ error: 'Failed to fetch widgets' });
        }

        res.json({ widgets: data || [] });
    } catch (error) {
        console.error('Widgets error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Create a new widget
router.post('/', authenticateUser, async (req, res) => {
    try {
        const { connection_id, widget_type, name, layout, post_count, theme } = req.body;

        if (!name || !widget_type) {
            return res.status(400).json({ error: 'Name and widget type are required' });
        }

        // TODO: Check plan limits (widget count)

        const { data, error } = await supabaseAdmin
            .from('widgets')
            .insert({
                user_id: req.user.id,
                connection_id: connection_id || null,
                widget_type,
                name,
                layout: layout || 'grid',
                post_count: post_count || 6,
                theme: theme || 'light',
            })
            .select()
            .single();

        if (error) {
            console.error('Create widget error:', error);
            return res.status(500).json({ error: 'Failed to create widget' });
        }

        res.status(201).json({ widget: data });
    } catch (error) {
        console.error('Create widget error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Update widget
router.put('/:id', authenticateUser, async (req, res) => {
    try {
        const { id } = req.params;
        const { name, layout, post_count, theme, custom_css, is_active } = req.body;

        const updateData = { updated_at: new Date().toISOString() };
        if (name !== undefined) updateData.name = name;
        if (layout !== undefined) updateData.layout = layout;
        if (post_count !== undefined) updateData.post_count = post_count;
        if (theme !== undefined) updateData.theme = theme;
        if (custom_css !== undefined) updateData.custom_css = custom_css;
        if (is_active !== undefined) updateData.is_active = is_active;

        const { data, error } = await supabaseAdmin
            .from('widgets')
            .update(updateData)
            .eq('id', id)
            .eq('user_id', req.user.id)
            .select()
            .single();

        if (error) {
            console.error('Update widget error:', error);
            return res.status(500).json({ error: 'Failed to update widget' });
        }

        res.json({ widget: data });
    } catch (error) {
        console.error('Update widget error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Delete widget
router.delete('/:id', authenticateUser, async (req, res) => {
    try {
        const { id } = req.params;

        const { error } = await supabaseAdmin
            .from('widgets')
            .delete()
            .eq('id', id)
            .eq('user_id', req.user.id);

        if (error) {
            console.error('Delete widget error:', error);
            return res.status(500).json({ error: 'Failed to delete widget' });
        }

        res.json({ success: true, message: 'Widget deleted successfully' });
    } catch (error) {
        console.error('Delete widget error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Add Instagram personal post (embed mode)
router.post('/:id/embeds', authenticateUser, async (req, res) => {
    try {
        const { id: widgetId } = req.params;
        const { post_url } = req.body;

        if (!post_url) {
            return res.status(400).json({ error: 'Post URL is required' });
        }

        // Validate URL
        if (!instagramOEmbed.isValidInstagramUrl(post_url)) {
            return res.status(400).json({ error: 'Invalid Instagram URL format' });
        }

        // Check widget belongs to user and is personal type
        const { data: widget, error: widgetError } = await supabaseAdmin
            .from('widgets')
            .select('*')
            .eq('id', widgetId)
            .eq('user_id', req.user.id)
            .eq('widget_type', 'instagram_personal')
            .single();

        if (widgetError || !widget) {
            return res.status(404).json({ error: 'Widget not found or invalid type' });
        }

        // Fetch oEmbed data
        const oembedData = await instagramOEmbed.fetchOEmbed(post_url);
        const caption = instagramOEmbed.extractCaption(oembedData.html);

        // Save embed
        const { data, error } = await supabaseAdmin
            .from('widget_embeds')
            .insert({
                widget_id: widgetId,
                post_url,
                oembed_html: oembedData.html,
                thumbnail_url: oembedData.thumbnail_url,
                caption,
                author_name: oembedData.author_name,
                media_type: oembedData.media_type,
            })
            .select()
            .single();

        if (error) {
            if (error.code === '23505') { // Unique constraint violation
                return res.status(409).json({ error: 'Post already added to this widget' });
            }
            console.error('Add embed error:', error);
            return res.status(500).json({ error: 'Failed to add post' });
        }

        res.status(201).json({ embed: data });
    } catch (error) {
        console.error('Add embed error:', error);
        res.status(500).json({ error: error.message || 'Failed to add post' });
    }
});

// Delete embed
router.delete('/:id/embeds/:embedId', authenticateUser, async (req, res) => {
    try {
        const { id: widgetId, embedId } = req.params;

        // Verify widget belongs to user
        const { data: widget } = await supabaseAdmin
            .from('widgets')
            .select('id')
            .eq('id', widgetId)
            .eq('user_id', req.user.id)
            .single();

        if (!widget) {
            return res.status(404).json({ error: 'Widget not found' });
        }

        const { error } = await supabaseAdmin
            .from('widget_embeds')
            .delete()
            .eq('id', embedId)
            .eq('widget_id', widgetId);

        if (error) {
            console.error('Delete embed error:', error);
            return res.status(500).json({ error: 'Failed to delete post' });
        }

        res.json({ success: true, message: 'Post removed successfully' });
    } catch (error) {
        console.error('Delete embed error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

module.exports = router;
