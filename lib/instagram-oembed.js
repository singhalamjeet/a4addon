const axios = require('axios');

const OEMBED_API = 'https://graph.facebook.com/v18.0/instagram_oembed';

/**
 * Validate Instagram URL format
 */
function isValidInstagramUrl(url) {
    const patterns = [
        /^https?:\/\/(www\.)?instagram\.com\/p\/[A-Za-z0-9_-]+\/?/,  // Post
        /^https?:\/\/(www\.)?instagram\.com\/reel\/[A-Za-z0-9_-]+\/?/, // Reel
        /^https?:\/\/(www\.)?instagram\.com\/tv\/[A-Za-z0-9_-]+\/?/,   // IGTV
    ];

    return patterns.some(pattern => pattern.test(url));
}

/**
 * Fetch oEmbed data for Instagram URL
 */
async function fetchOEmbed(postUrl) {
    if (!isValidInstagramUrl(postUrl)) {
        throw new Error('Invalid Instagram URL format');
    }

    const accessToken = `${process.env.META_APP_ID}|${process.env.META_APP_SECRET}`;

    try {
        const response = await axios.get(OEMBED_API, {
            params: {
                url: postUrl,
                access_token: accessToken,
                omitscript: true, // We'll load the script once globally
            },
        });

        return {
            html: response.data.html,
            thumbnail_url: response.data.thumbnail_url,
            author_name: response.data.author_name,
            media_type: response.data.type || 'rich',
            title: response.data.title || '',
        };
    } catch (error) {
        console.error('oEmbed fetch error:', error.response?.data || error.message);

        // Handle specific errors
        if (error.response?.status === 400) {
            throw new Error('Post may be private or deleted');
        }

        throw new Error('Failed to fetch Instagram post data');
    }
}

/**
 * Extract caption from oEmbed HTML
 */
function extractCaption(html) {
    // Try to extract text from the embed HTML
    const match = html.match(/<p[^>]*>(.*?)<\/p>/);
    if (match && match[1]) {
        // Strip HTML tags
        return match[1].replace(/<[^>]*>/g, '').trim();
    }
    return '';
}

module.exports = {
    isValidInstagramUrl,
    fetchOEmbed,
    extractCaption,
};
