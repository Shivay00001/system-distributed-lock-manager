
import Client from 'ioredis';
import Redlock, { Lock } from 'redlock';
import { logger } from './utils/logger';

export class LockManager {
    private redlock: Redlock;
    private redisClient: Client;

    constructor() {
        const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
        this.redisClient = new Client(redisUrl);

        this.redlock = new Redlock(
            [this.redisClient],
            {
                driftFactor: 0.01,
                retryCount: 3,
                retryDelay: 200,
                retryJitter: 200,
                automaticExtensionThreshold: 500
            }
        );

        this.redlock.on('error', (error) => {
            logger.error('Redlock error:', error);
        });
    }

    public async acquire(resource: string, ttl: number): Promise<Lock> {
        logger.info(`Attempting to lock resource: ${resource}`);
        return await this.redlock.acquire([resource], ttl);
    }

    public async release(resource: string, value: string): Promise<void> {
        // Reconstructing lock to release it based on value is tricky in strict Redlock
        // We would typically need the Lock object.
        // For this production-grade demo, we'd implementation a script release
        // or maintain a local map of active locks if this service is the only holder.

        // Custom release script for generic 'release by value' if we were doing raw Redis
        // But with Redlock lib, we obey its contract.
        // Since this is a demo, we will log a warning that we can't release without the object object
        // unless we stored it.

        // BETTER APPROACH: Use the client.unlock script directly if we want stateless.
        // But to keep it simple and compile-safe:

        const script = `
        if redis.call("get", KEYS[1]) == ARGV[1] then
            return redis.call("del", KEYS[1])
        else
            return 0
        end
     `;

        await this.redisClient.eval(script, 1, resource, value);
        logger.info(`Released lock for resource: ${resource}`);
    }
}
