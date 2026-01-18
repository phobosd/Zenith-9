import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { DatabaseService } from './DatabaseService';
import { Logger } from '../utils/Logger';

const JWT_SECRET = process.env.JWT_SECRET || 'zenith-9-super-secret-key';

export interface User {
    id: number;
    username: string;
    role: string;
}

export class AuthService {
    private static instance: AuthService;
    private db = DatabaseService.getInstance().getDb();

    private constructor() { }

    public static getInstance(): AuthService {
        if (!AuthService.instance) {
            AuthService.instance = new AuthService();
        }
        return AuthService.instance;
    }

    public async register(username: string, password: string): Promise<{ success: boolean; message: string; user?: User }> {
        try {
            const hashedPassword = await bcrypt.hash(password, 10);
            const role = username.toLowerCase() === 'pho' ? 'god' : 'user';
            const stmt = this.db.prepare('INSERT INTO users (username, password_hash, role) VALUES (?, ?, ?)');
            const result = stmt.run(username, hashedPassword, role);

            return {
                success: true,
                message: 'User registered successfully',
                user: { id: result.lastInsertRowid as number, username, role }
            };
        } catch (error: any) {
            if (error.code === 'SQLITE_CONSTRAINT' || error.code === 'SQLITE_CONSTRAINT_UNIQUE') {
                return { success: false, message: 'Username already exists' };
            }
            Logger.error('Auth', 'Registration error', error);
            return { success: false, message: 'Internal server error' };
        }
    }

    public async login(username: string, password: string): Promise<{ success: boolean; message: string; token?: string; user?: User }> {
        try {
            const stmt = this.db.prepare('SELECT * FROM users WHERE username = ?');
            const user = stmt.get(username) as any;

            if (!user) {
                Logger.warn('Auth', `Login failed: User not found - ${username}`);
                return { success: false, message: 'Invalid username or password' };
            }

            const validPassword = await bcrypt.compare(password, user.password_hash);
            if (!validPassword) {
                Logger.warn('Auth', `Login failed: Invalid password for user - ${username}`);
                return { success: false, message: 'Invalid username or password' };
            }

            const token = jwt.sign(
                { id: user.id, username: user.username, role: user.role },
                JWT_SECRET,
                { expiresIn: '24h' }
            );

            return {
                success: true,
                message: 'Login successful',
                token,
                user: { id: user.id, username: user.username, role: user.role }
            };
        } catch (error) {
            Logger.error('Auth', 'Login error', error);
            return { success: false, message: 'Internal server error' };
        }
    }

    public verifyToken(token: string): User | null {
        try {
            const decoded = jwt.verify(token, JWT_SECRET) as User;

            // Verify user still exists in DB (handle DB wipes/resets)
            const stmt = this.db.prepare('SELECT id, username, role FROM users WHERE id = ?');
            const user = stmt.get(decoded.id) as User;

            if (!user) {
                return null;
            }

            return user;
        } catch (error) {
            return null;
        }
    }

    public getAllUsers(): User[] {
        return this.db.prepare('SELECT id, username, role FROM users').all() as User[];
    }

    public updateUserRole(userId: number, role: string): boolean {
        try {
            const stmt = this.db.prepare('UPDATE users SET role = ? WHERE id = ?');
            const result = stmt.run(role, userId);
            return result.changes > 0;
        } catch (error) {
            Logger.error('Auth', 'Update role error', error);
            return false;
        }
    }

    public async updateUserPassword(userId: number, newPassword: string): Promise<boolean> {
        try {
            const hashedPassword = await bcrypt.hash(newPassword, 10);
            const stmt = this.db.prepare('UPDATE users SET password_hash = ? WHERE id = ?');
            const result = stmt.run(hashedPassword, userId);
            return result.changes > 0;
        } catch (error) {
            Logger.error('Auth', 'Update password error', error);
            return false;
        }
    }

    public deleteUser(userId: number): boolean {
        try {
            // Guard: Never delete 'pho' - this is the primary god character
            const user = this.db.prepare('SELECT username FROM users WHERE id = ?').get(userId) as any;
            if (user && user.username.toLowerCase() === 'pho') {
                Logger.warn('Auth', `Attempted to delete god character 'pho' (ID: ${userId}) - BLOCKED.`);
                return false;
            }

            // Delete characters first to satisfy FK constraints
            this.db.prepare('DELETE FROM characters WHERE user_id = ?').run(userId);

            const stmt = this.db.prepare('DELETE FROM users WHERE id = ?');
            const result = stmt.run(userId);
            return result.changes > 0;
        } catch (error) {
            Logger.error('Auth', 'Delete user error', error);
            return false;
        }
    }
}
