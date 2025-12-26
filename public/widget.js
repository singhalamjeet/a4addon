/**
 * A4 Addon Instagram Widget
 * Embeddable widget for displaying Instagram content
 * 
 * Usage: <script src="https://a4addon.com/widget.js" data-widget-id="YOUR_WIDGET_ID"></script>
 */

(function () {
    'use strict';

    // Get widget ID from script tag
    const currentScript = document.currentScript || document.querySelector('script[data-widget-id]');
    const widgetId = currentScript?.getAttribute('data-widget-id');

    if (!widgetId) {
        console.error('[A4 Widget] Error: data-widget-id attribute is required');
        return;
    }

    const API_BASE = currentScript?.src ? new URL(currentScript.src).origin : 'https://a4addon.com';
    const WIDGET_API = `${API_BASE}/api/widget/${widgetId}/feed`;

    // Widget container
    let container;

    // Initialize widget
    async function init() {
        try {
            // Create container
            container = document.createElement('div');
            container.className = 'a4-instagram-widget';
            container.id = `a4-widget-${widgetId}`;

            // Insert after script tag
            currentScript.parentNode.insertBefore(container, currentScript.nextSibling);

            // Show loading
            showLoading();

            // Fetch widget data
            const response = await fetch(WIDGET_API);
            const data = await response.json();

            if (!data.success) {
                throw new Error(data.error || 'Failed to load widget');
            }

            // Render widget
            renderWidget(data);
        } catch (error) {
            console.error('[A4 Widget] Error:', error);
            showError(error.message);
        }
    }

    // Show loading state
    function showLoading() {
        container.innerHTML = `
            <div class="a4-widget-loading">
                <div class="a4-spinner"></div>
                <p>Loading...</p>
            </div>
        `;
    }

    // Show error
    function showError(message) {
        container.innerHTML = `
            <div class="a4-widget-error">
                <p>⚠️ ${message}</p>
                <small>Powered by <a href="https://a4addon.com" target="_blank">A4 Addon</a></small>
            </div>
        `;
    }

    // Render widget
    function renderWidget(data) {
        const { widget, posts } = data;

        if (!posts || posts.length === 0) {
            container.innerHTML = `
                <div class="a4-widget-empty">
                    <p>No posts available</p>
                </div>
            `;
            return;
        }

        // Apply theme
        container.classList.add(`a4-theme-${widget.theme || 'light'}`);
        container.classList.add(`a4-layout-${widget.layout || 'grid'}`);

        // Render based on layout
        if (widget.layout === 'carousel') {
            renderCarousel(posts);
        } else {
            renderGrid(posts);
        }

        // Add Instagram embed script if needed (for personal mode)
        if (posts.some(p => p.type === 'embed')) {
            loadInstagramEmbedScript();
        }

        // Add branding
        addBranding();
    }

    // Render grid layout
    function renderGrid(posts) {
        const grid = document.createElement('div');
        grid.className = 'a4-widget-grid';

        posts.forEach(post => {
            const item = createPostElement(post);
            grid.appendChild(item);
        });

        container.innerHTML = '';
        container.appendChild(grid);
    }

    // Render carousel layout
    function renderCarousel(posts) {
        const carousel = document.createElement('div');
        carousel.className = 'a4-widget-carousel';

        const track = document.createElement('div');
        track.className = 'a4-carousel-track';

        posts.forEach(post => {
            const item = createPostElement(post);
            track.appendChild(item);
        });

        carousel.appendChild(track);

        // Add navigation buttons
        const prevBtn = document.createElement('button');
        prevBtn.className = 'a4-carousel-btn a4-carousel-prev';
        prevBtn.innerHTML = '‹';
        prevBtn.onclick = () => scrollCarousel(-1);

        const nextBtn = document.createElement('button');
        nextBtn.className = 'a4-carousel-btn a4-carousel-next';
        nextBtn.innerHTML = '›';
        nextBtn.onclick = () => scrollCarousel(1);

        carousel.appendChild(prevBtn);
        carousel.appendChild(nextBtn);

        container.innerHTML = '';
        container.appendChild(carousel);
    }

    // Create post element
    function createPostElement(post) {
        const item = document.createElement('div');
        item.className = 'a4-post-item';

        if (post.type === 'embed') {
            // Instagram personal (oEmbed)
            item.innerHTML = post.html;
        } else {
            // Instagram Business (image/video)
            const media = post.type === 'video'
                ? `<video src="${post.url}" poster="${post.thumbnail}" playsinline loop muted></video>`
                : `<img src="${post.url}" alt="${escapeHtml(post.caption || '')}" loading="lazy">`;

            item.innerHTML = `
                <a href="${post.permalink}" target="_blank" rel="noopener">
                    ${media}
                    ${post.caption ? `<div class="a4-post-caption">${escapeHtml(truncate(post.caption, 100))}</div>` : ''}
                </a>
            `;

            // Video hover play
            if (post.type === 'video') {
                const video = item.querySelector('video');
                item.addEventListener('mouseenter', () => video.play());
                item.addEventListener('mouseleave', () => { video.pause(); video.currentTime = 0; });
            }
        }

        return item;
    }

    // Carousel scroll
    function scrollCarousel(direction) {
        const track = container.querySelector('.a4-carousel-track');
        const itemWidth = track.querySelector('.a4-post-item').offsetWidth + 16; // Including gap
        track.scrollBy({ left: direction * itemWidth, behavior: 'smooth' });
    }

    // Load Instagram embed script
    function loadInstagramEmbedScript() {
        if (window.instgrm) {
            window.instgrm.Embeds.process();
            return;
        }

        const script = document.createElement('script');
        script.src = '//www.instagram.com/embed.js';
        script.async = true;
        document.body.appendChild(script);
    }

    // Add branding
    function addBranding() {
        const branding = document.createElement('div');
        branding.className = 'a4-widget-branding';
        branding.innerHTML = `
            <small>Powered by <a href="https://a4addon.com" target="_blank" rel="noopener">A4 Addon</a></small>
        `;
        container.appendChild(branding);
    }

    // Utility functions
    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    function truncate(text, length) {
        return text.length > length ? text.substring(0, length) + '...' : text;
    }

    // Inject styles
    function injectStyles() {
        if (document.getElementById('a4-widget-styles')) return;

        const style = document.createElement('style');
        style.id = 'a4-widget-styles';
        style.textContent = `
            .a4-instagram-widget { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; max-width: 100%; margin: 20px 0; }
            .a4-widget-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(250px, 1fr)); gap: 16px; }
            .a4-post-item { position: relative; overflow: hidden; border-radius: 8px; background: #f0f0f0; aspect-ratio: 1; }
            .a4-post-item img, .a4-post-item video { width: 100%; height: 100%; object-fit: cover; display: block; }
            .a4-post-item a { display: block; position: relative; height: 100%; text-decoration: none; }
            .a4-post-caption { position: absolute; bottom: 0; left: 0; right: 0; padding: 12px; background: linear-gradient(transparent, rgba(0,0,0,0.7)); color: white; font-size: 14px; }
            .a4-widget-carousel { position: relative; overflow: hidden; }
            .a4-carousel-track { display: flex; gap: 16px; overflow-x: auto; scroll-behavior: smooth; scrollbar-width: none; }
            .a4-carousel-track::-webkit-scrollbar { display: none; }
            .a4-carousel-btn { position: absolute; top: 50%; transform: translateY(-50%); background: rgba(0,0,0,0.5); color: white; border: none; width: 40px; height: 40px; border-radius: 50%; cursor: pointer; font-size: 24px; z-index: 10; }
            .a4-carousel-prev { left: 10px; }
            .a4-carousel-next { right: 10px; }
            .a4-carousel-btn:hover { background: rgba(0,0,0,0.7); }
            .a4-widget-loading, .a4-widget-error, .a4-widget-empty { text-align: center; padding: 40px 20px; }
            .a4-spinner { border: 3px solid #f3f3f3; border-top: 3px solid #667eea; border-radius: 50%; width: 40px; height: 40px; animation: spin 1s linear infinite; margin: 0 auto 10px; }
            @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
            .a4-widget-branding { text-align: center; margin-top: 16px; font-size: 12px; color: #999; }
            .a4-widget-branding a { color: #667eea; text-decoration: none; }
            .a4-theme-dark { background: #1a1a1a; color: #fff; }
            .a4-theme-dark .a4-post-item { background: #2a2a2a; }
            @media (max-width: 768px) { .a4-widget-grid { grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); } }
        `;
        document.head.appendChild(style);
    }

    // Start
    injectStyles();

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
