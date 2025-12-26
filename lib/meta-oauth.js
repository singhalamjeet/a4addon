const axios = require('axios');
const { encrypt, decrypt } = require('./encryption');

const GRAPH_API_BASE = 'https://graph.facebook.com/v18.0';

/**
 * Generate Meta OAuth authorization URL
 */
function getAuthorizationUrl() {
    const appId = process.env.META_APP_ID;
    const redirectUri = process.env.META_REDIRECT_URI;

    if (!appId || !redirectUri) {
        throw new Error('META_APP_ID and META_REDIRECT_URI must be set');
    }

    const scopes = [
        'pages_show_list',
        'pages_read_engagement',
        'instagram_basic',
        'instagram_content_publish',
        'business_management'
    ].join(',');

    const params = new URLSearchParams({
        client_id: appId,
        redirect_uri: redirectUri,
        scope: scopes,
        response_type: 'code',
        state: Math.random().toString(36).substring(7), // CSRF protection
    });

    return `https://www.facebook.com/v18.0/dialog/oauth?${params.toString()}`;
}

/**
 * Exchange authorization code for access token
 */
async function exchangeCodeForToken(code) {
    const appId = process.env.META_APP_ID;
    const appSecret = process.env.META_APP_SECRET;
    const redirectUri = process.env.META_REDIRECT_URI;

    if (!appId || !appSecret || !redirectUri) {
        throw new Error('Meta credentials not configured');
    }

    try {
        const response = await axios.get(`${GRAPH_API_BASE}/oauth/access_token`, {
            params: {
                client_id: appId,
                client_secret: appSecret,
                redirect_uri: redirectUri,
                code,
            },
        });

        return response.data.access_token;
    } catch (error) {
        console.error('Token exchange error:', error.response?.data || error.message);
        throw new Error('Failed to exchange code for token');
    }
}

/**
 * Exchange short-lived token for long-lived token (60 days)
 */
async function getLongLivedToken(shortLivedToken) {
    const appId = process.env.META_APP_ID;
    const appSecret = process.env.META_APP_SECRET;

    try {
        const response = await axios.get(`${GRAPH_API_BASE}/oauth/access_token`, {
            params: {
                grant_type: 'fb_exchange_token',
                client_id: appId,
                client_secret: appSecret,
                fb_exchange_token: shortLivedToken,
            },
        });

        return {
            access_token: response.data.access_token,
            expires_in: response.data.expires_in, // seconds
        };
    } catch (error) {
        console.error('Long-lived token error:', error.response?.data || error.message);
        throw new Error('Failed to get long-lived token');
    }
}

/**
 * Get user's Facebook Pages
 */
async function getUserPages(accessToken) {
    try {
        const response = await axios.get(`${GRAPH_API_BASE}/me/accounts`, {
            params: {
                access_token: accessToken,
                fields: 'id,name,access_token,instagram_business_account',
            },
        });

        return response.data.data || [];
    } catch (error) {
        console.error('Get pages error:', error.response?.data || error.message);
        throw new Error('Failed to fetch Facebook Pages');
    }
}

/**
 * Get Instagram Business Account for a Page
 */
async function getInstagramBusinessAccount(pageId, pageAccessToken) {
    try {
        const response = await axios.get(`${GRAPH_API_BASE}/${pageId}`, {
            params: {
                access_token: pageAccessToken,
                fields: 'instagram_business_account',
            },
        });

        if (!response.data.instagram_business_account) {
            return null;
        }

        // Get Instagram account details
        const igResponse = await axios.get(
            `${GRAPH_API_BASE}/${response.data.instagram_business_account.id}`,
            {
                params: {
                    access_token: pageAccessToken,
                    fields: 'id,username,profile_picture_url',
                },
            }
        );

        return igResponse.data;
    } catch (error) {
        console.error('Get Instagram account error:', error.response?.data || error.message);
        return null;
    }
}

/**
 * Refresh access token
 */
async function refreshAccessToken(currentToken) {
    // For long-lived tokens, Meta recommends refreshing before expiry
    // This exchanges existing long-lived token for a new one
    return await getLongLivedToken(currentToken);
}

module.exports = {
    getAuthorizationUrl,
    exchangeCodeForToken,
    getLongLivedToken,
    getUserPages,
    getInstagramBusinessAccount,
    refreshAccessToken,
};
