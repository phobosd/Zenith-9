import crypto from 'crypto';
import dotenv from 'dotenv';

dotenv.config();

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;

/**
 * Utility for secure encryption and decryption of sensitive data.
 * Uses AES-256-GCM for authenticated encryption.
 */
export class Encryption {
    private static getSecretKey(): Buffer {
        const key = process.env.ENCRYPTION_KEY;
        if (!key) {
            throw new Error('ENCRYPTION_KEY environment variable is not set.');
        }
        // Ensure the key is 32 bytes for AES-256
        return crypto.createHash('sha256').update(String(key)).digest();
    }

    /**
     * Encrypts a plain text string.
     * Returns a string in the format: iv:authTag:encryptedData
     */
    public static encrypt(text: string): string {
        const iv = crypto.randomBytes(IV_LENGTH);
        const key = this.getSecretKey();
        const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

        let encrypted = cipher.update(text, 'utf8', 'hex');
        encrypted += cipher.final('hex');

        const authTag = cipher.getAuthTag().toString('hex');

        return `${iv.toString('hex')}:${authTag}:${encrypted}`;
    }

    /**
     * Decrypts an encrypted string.
     * Expects format: iv:authTag:encryptedData
     */
    public static decrypt(encryptedText: string): string {
        try {
            const parts = encryptedText.split(':');
            if (parts.length !== 3) {
                throw new Error('Invalid encrypted text format.');
            }

            const iv = Buffer.from(parts[0], 'hex');
            const authTag = Buffer.from(parts[1], 'hex');
            const encryptedData = parts[2];

            const key = this.getSecretKey();
            const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
            decipher.setAuthTag(authTag);

            let decrypted = decipher.update(encryptedData, 'hex', 'utf8');
            decrypted += decipher.final('utf8');

            return decrypted;
        } catch (err) {
            throw new Error(`Decryption failed: ${err instanceof Error ? err.message : String(err)}`);
        }
    }

    /**
     * Helper to check if a string is likely encrypted with our format.
     */
    public static isEncrypted(text: string): boolean {
        return text.startsWith('enc:');
    }

    /**
     * Wraps a string in the 'enc:' prefix after encryption.
     */
    public static secureEncrypt(text: string): string {
        return `enc:${this.encrypt(text)}`;
    }

    /**
     * Decrypts only if the string has the 'enc:' prefix.
     */
    public static secureDecrypt(text: string): string {
        if (this.isEncrypted(text)) {
            return this.decrypt(text.substring(4));
        }
        return text;
    }
}
