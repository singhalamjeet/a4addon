const axios = require('axios');

const GRAPH_API_BASE = 'https://graph.facebook.com/v18.0';

/**
 * Fetch Instagram Business Account media
 */
async function getInstagramMedia(igBusinessAccountId, accessToken, limit = 25) {
    try {
        const response = await axios.get(
            `${GRAPH_API_BASE}/${igBusinessAccountId}/media`,
            {
                params: {
                    access_token: accessToken,
                    fields: 'id,caption,media_type,media_url,thumbnail_url,permalink,timestamp',
                    limit,
                },
            }
        );

        return response.data.data || [];
    } catch (error) {
        console.error('Get Instagram media error:', error.response?.data || error.message);
        throw new Error('Failed to fetch Instagram media');
    }
}

/**
 * Get detailed media information
 */
async function getMediaDetails(mediaId, accessToken) {
    try {
        const response = await axios.get(`${GRAPH_API_BASE}/${mediaId}`, {
            params: {
                access_token: accessToken,
                fields: 'id,caption,media_type,media_url,thumbnail_url,permalink,timestamp,like_count,comments_count',
            },
        });

        return response.data;
    } catch (error) {
        console.error('Get media details error:', error.response?.data || error.message);
        return null;
    }
}

/**
 * Format media for widget consumption
 */
function formatMediaForWidget(media) {
    return media.map(item => ({
        id: item.id,
        type: item.media_type?.toLowerCase() || 'image',
        url: item.media_url,
        thumbnail: item.thumbnail_url || item.media_url,
        caption: item.caption || '',
        permalink: item.permalink,
        timestamp: item.timestamp,
    }));
}

module.exports = {
    getInstagramMedia,
    getMediaDetails,
    formatMediaForWidget,
};
