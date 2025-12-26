const express = require('express');
const router = express.Router();
const { supabaseAdmin } = require('../config/supabase');
const { authenticateUser } = require('../middleware/auth');
const metaOAuth = require('../lib/meta-oauth');
const { encrypt, decrypt } = require('../lib/encryption');

// Initiate Facebook/Instagram OAuth flow
router.get('/connect/facebook', authenticateUser, async (req, res) => {
    try {
        const authUrl = metaOAuth.getAuthorizationUrl();
        // Store user_id in session/state for callback (simplified - use proper session in production)
        res.redirect(authUrl);
    } catch (error) {
        console.error('OAuth initiate error:', error);
        res.status(500).json({ error: 'Failed to initiate OAuth flow' });
    }
});

// OAuth callback from Facebook
router.get('/callback/facebook', async (req, res) => {
    const { code, state, error } = req.query;

    if (error) {
        return res.redirect('/dashboard/social?error=access_denied');
    }

    if (!code) {
        return res.redirect('/dashboard/social?error=no_code');
    }

    try {
        // Exchange code for access token
        const shortToken = await metaOAuth.exchangeCodeForToken(code);

        // Get long-lived token (60 days)
        const { access_token, expires_in } = await metaOAuth.getLongLivedToken(shortToken);

        // Get user's Facebook Pages
        const pages = await metaOAuth.getUserPages(access_token);

        if (pages.length === 0) {
            return res.redirect('/dashboard/social?error=no_pages');
        }

        // For simplicity, we'll process the first page with an Instagram account
        // In production, show user a page selector
        let savedConnection = null;

        for (const page of pages) {
            const igAccount = await metaOAuth.getInstagramBusinessAccount(page.id, page.access_token);

            if (igAccount) {
                // Found Instagram Business account
                // TODO: Get user_id from session (for now, this won't work without proper auth)
                // This is a placeholder - in production, use proper session management

                const tokenExpiry = new Date(Date.now() + expires_in * 1000);
                const encryptedToken = encrypt(page.access_token);

                // Save connection
                const { data, error: dbError } = await supabaseAdmin
                    .from('social_connections')
                    .insert({
                        // user_id: req.user.id, // From session
                        provider: 'instagram_business',
                        page_id: page.id,
                        page_name: page.name,
                        ig_business_account_id: igAccount.id,
                        ig_username: igAccount.username,
                        access_token: encryptedToken,
                        token_expiry: tokenExpiry,
                        metadata: {
                            profile_picture_url: igAccount.profile_picture_url,
                        },
                    })
                    .select()
                    .single();

                if (!dbError) {
                    savedConnection = data;
                    break;
                }
            }
        }

        if (savedConnection) {
            res.redirect('/dashboard/social?success=connected');
        } else {
            res.redirect('/dashboard/social?error=no_instagram');
        }
    } catch (error) {
        console.error('OAuth callback error:', error);
        res.redirect('/dashboard/social?error=server_error');
    }
});

// Get user's social connections
router.get('/connections', authenticateUser, async (req, res) => {
    try {
        const { data, error } = await supabaseAdmin
            .from('social_connections')
            .select('id, provider, page_name, ig_username, connected_at, token_expiry')
            .eq('user_id', req.user.id)
            .order('connected_at', { ascending: false });

        if (error) {
            console.error('Get connections error:', error);
            return res.status(500).json({ error: 'Failed to fetch connections' });
        }

        res.json({ connections: data || [] });
    } catch (error) {
        console.error('Connections error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Disconnect a social connection
router.delete('/connections/:id', authenticateUser, async (req, res) => {
    try {
        const { id } = req.params;

        // Delete connection (will cascade to widgets via foreign key)
        const { error } = await supabaseAdmin
            .from('social_connections')
            .delete()
            .eq('id', id)
            .eq('user_id', req.user.id);

        if (error) {
            console.error('Delete connection error:', error);
            return res.status(500).json({ error: 'Failed to disconnect' });
        }

        res.json({ success: true, message: 'Connection deleted successfully' });
    } catch (error) {
        console.error('Disconnect error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Refresh connection token
router.post('/reconnect/:id', authenticateUser, async (req, res) => {
    try {
        const { id } = req.params;

        // Get connection
        const { data: connection, error: fetchError } = await supabaseAdmin
            .from('social_connections')
            .select('*')
            .eq('id', id)
            .eq('user_id', req.user.id)
            .single();

        if (fetchError || !connection) {
            return res.status(404).json({ error: 'Connection not found' });
        }

        // Decrypt token
        const currentToken = decrypt(connection.access_token);

        // Refresh token
        const { access_token, expires_in } = await metaOAuth.refreshAccessToken(currentToken);

        // Update connection
        const encryptedToken = encrypt(access_token);
        const tokenExpiry = new Date(Date.now() + expires_in * 1000);

        const { error: updateError } = await supabaseAdmin
            .from('social_connections')
            .update({
                access_token: encryptedToken,
                token_expiry: tokenExpiry,
                updated_at: new Date().toISOString(),
            })
            .eq('id', id);

        if (updateError) {
            return res.status(500).json({ error: 'Failed to refresh token' });
        }

        res.json({ success: true, message: 'Token refreshed successfully' });
    } catch (error) {
        console.error('Reconnect error:', error);
        res.status(500).json({ error: 'Failed to refresh connection' });
    }
});

module.exports = router;
