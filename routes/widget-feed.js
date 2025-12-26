const express = require('express');
const router = express.Router();
const { supabaseAdmin } = require('../config/supabase');
const { decrypt } = require('../lib/encryption');
const instagram = require('../lib/instagram');

// Public widget feed endpoint (no authentication required)
router.get('/:widgetId/feed', async (req, res) => {
    try {
        const { widgetId } = req.params;

        // Get widget details
        const { data: widget, error: widgetError } = await supabaseAdmin
            .from('widgets')
            .select(`
                *,
                connection:social_connections(*)
            `)
            .eq('id', widgetId)
            .eq('is_active', true)
            .single();

        if (widgetError || !widget) {
            return res.status(404).json({ error: 'Widget not found or inactive' });
        }

        // TODO: Check plan limits and expiry
        // For now, return data

        // Check cache
        const { data: cache } = await supabaseAdmin
            .from('widget_cache')
            .select('*')
            .eq('widget_id', widgetId)
            .single();

        const CACHE_DURATION = 15 * 60 * 1000; // 15 minutes
        const now = new Date();

        if (cache && new Date(cache.cached_at) > new Date(now - CACHE_DURATION)) {
            // Return cached data
            return res.json({
                success: true,
                widget: {
                    id: widget.id,
                    name: widget.name,
                    layout: widget.layout,
                    theme: widget.theme,
                },
                posts: cache.feed_data,
                cached: true,
            });
        }

        // Fetch fresh data based on widget type
        let posts = [];

        if (widget.widget_type === 'instagram_business' && widget.connection) {
            // Fetch from Instagram Business API
            const accessToken = decrypt(widget.connection.access_token);
            const media = await instagram.getInstagramMedia(
                widget.connection.ig_business_account_id,
                accessToken,
                widget.post_count
            );
            posts = instagram.formatMediaForWidget(media);
        } else if (widget.widget_type === 'instagram_personal') {
            // Fetch embeds
            const { data: embeds } = await supabaseAdmin
                .from('widget_embeds')
                .select('*')
                .eq('widget_id', widgetId)
                .order('created_at', { ascending: false })
                .limit(widget.post_count);

            posts = embeds?.map(embed => ({
                id: embed.id,
                type: 'embed',
                html: embed.oembed_html,
                thumbnail: embed.thumbnail_url,
                caption: embed.caption,
                author: embed.author_name,
            })) || [];
        }

        // Update cache
        await supabaseAdmin
            .from('widget_cache')
            .upsert({
                widget_id: widgetId,
                feed_data: posts,
                cached_at: now.toISOString(),
            }, { onConflict: 'widget_id' });

        res.json({
            success: true,
            widget: {
                id: widget.id,
                name: widget.name,
                layout: widget.layout,
                theme: widget.theme,
            },
            posts,
            cached: false,
        });
    } catch (error) {
        console.error('Widget feed error:', error);
        res.status(500).json({ error: 'Failed to load widget feed' });
    }
});

module.exports = router;
