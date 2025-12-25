const supabase = require('../config/supabase');

// Admin email allowlist from environment variable
const getAdminEmails = () => {
    const emails = process.env.ADMIN_EMAILS || '';
    return emails.split(',').map(email => email.trim()).filter(email => email);
};

// Middleware to verify Supabase JWT token
const authenticateUser = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ error: 'Missing or invalid authorization header' });
        }

        const token = authHeader.replace('Bearer ', '');

        if (!supabase) {
            return res.status(503).json({ error: 'Supabase not configured' });
        }

        // Verify the JWT token
        const { data: { user }, error } = await supabase.auth.getUser(token);

        if (error || !user) {
            return res.status(401).json({ error: 'Invalid or expired token' });
        }

        // Attach user to request
        req.user = user;
        next();
    } catch (error) {
        console.error('Auth middleware error:', error);
        return res.status(500).json({ error: 'Authentication failed' });
    }
};

// Middleware to check if user is admin
const requireAdmin = (req, res, next) => {
    const adminEmails = getAdminEmails();

    if (adminEmails.length === 0) {
        return res.status(503).json({
            error: 'Admin access not configured. Please set ADMIN_EMAILS environment variable.'
        });
    }

    if (!req.user || !adminEmails.includes(req.user.email)) {
        return res.status(403).json({
            error: 'Access denied. Admin privileges required.'
        });
    }

    next();
};

module.exports = {
    authenticateUser,
    requireAdmin,
    getAdminEmails
};
