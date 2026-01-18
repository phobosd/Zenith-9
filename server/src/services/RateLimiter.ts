import { Socket } from 'socket.io';
import { Logger } from '../utils/Logger';

interface RateLimitInfo {
    count: number;
    lastReset: number;
}

export class RateLimiter {
    private limits: Map<string, RateLimitInfo> = new Map();
    private readonly MAX_REQUESTS = 20; // Max requests per second
    private readonly WINDOW_MS = 1000; // 1 second window

    public checkLimit(socketId: string): boolean {
        const now = Date.now();
        let info = this.limits.get(socketId);

        if (!info) {
            info = { count: 0, lastReset: now };
            this.limits.set(socketId, info);
        }

        if (now - info.lastReset > this.WINDOW_MS) {
            info.count = 0;
            info.lastReset = now;
        }

        info.count++;

        if (info.count > this.MAX_REQUESTS) {
            Logger.warn('Security', `Rate limit exceeded for ${socketId}`);
            return false;
        }

        return true;
    }

    public cleanup(socketId: string) {
        this.limits.delete(socketId);
    }
}
