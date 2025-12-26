const crypto = require('crypto');

// Encryption algorithm
const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const SALT_LENGTH = 64;
const TAG_LENGTH = 16;
const KEY_LENGTH = 32;

// Get encryption key from environment or generate one
function getEncryptionKey() {
    const key = process.env.ENCRYPTION_KEY;
    if (!key || key.length < 32) {
        console.warn('Warning: ENCRYPTION_KEY not set or too short. Using fallback (NOT SECURE FOR PRODUCTION)');
        return crypto.scryptSync('fallback-key-change-me', 'salt', KEY_LENGTH);
    }
    return crypto.scryptSync(key, 'salt', KEY_LENGTH);
}

/**
 * Encrypt a string (like access token)
 * Returns: base64 encoded string containing: salt + iv + tag + encrypted data
 */
function encrypt(text) {
    if (!text) return null;

    try {
        const key = getEncryptionKey();

        // Generate random IV
        const iv = crypto.randomBytes(IV_LENGTH);

        // Create cipher
        const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

        // Encrypt
        let encrypted = cipher.update(text, 'utf8', 'hex');
        encrypted += cipher.final('hex');

        // Get auth tag
        const tag = cipher.getAuthTag();

        // Combine: iv + tag + encrypted
        const combined = Buffer.concat([
            iv,
            tag,
            Buffer.from(encrypted, 'hex')
        ]);

        return combined.toString('base64');
    } catch (error) {
        console.error('Encryption error:', error);
        throw new Error('Failed to encrypt data');
    }
}

/**
 * Decrypt a string
 * Input: base64 encoded string from encrypt()
 * Returns: original plaintext
 */
function decrypt(encryptedData) {
    if (!encryptedData) return null;

    try {
        const key = getEncryptionKey();

        // Decode from base64
        const combined = Buffer.from(encryptedData, 'base64');

        // Extract components
        const iv = combined.slice(0, IV_LENGTH);
        const tag = combined.slice(IV_LENGTH, IV_LENGTH + TAG_LENGTH);
        const encrypted = combined.slice(IV_LENGTH + TAG_LENGTH);

        // Create decipher
        const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
        decipher.setAuthTag(tag);

        // Decrypt
        let decrypted = decipher.update(encrypted, 'hex', 'utf8');
        decrypted += decipher.final('utf8');

        return decrypted;
    } catch (error) {
        console.error('Decryption error:', error);
        throw new Error('Failed to decrypt data');
    }
}

/**
 * Hash a string (one-way, for verification)
 */
function hash(text) {
    return crypto.createHash('sha256').update(text).digest('hex');
}

module.exports = {
    encrypt,
    decrypt,
    hash,
};
