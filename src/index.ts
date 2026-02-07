
import express from 'express';
import dotenv from 'dotenv';
import { LockManager } from './lock-manager';
import { logger } from './utils/logger';

dotenv.config();

const app = express();
app.use(express.json());

const lockManager = new LockManager();

// Acquire Lock
app.post('/locks', async (req, res) => {
    try {
        const { resource, ttl } = req.body;
        if (!resource || !ttl) {
            return res.status(400).json({ error: 'resource and ttl are required' });
        }

        const lock = await lockManager.acquire(resource, ttl);
        res.status(201).json({
            status: 'acquired',
            resource: lock.resources,
            value: lock.value,
            expiration: lock.expiration
        });
    } catch (error: any) {
        logger.error('Failed to acquire lock', { error: error.message });
        res.status(409).json({ error: 'Resource locked' });
    }
});

// Release Lock
app.delete('/locks', async (req, res) => {
    try {
        const { resource, value } = req.body;
        // In a real implementation, we'd need the Lock object reconstruct logic
        // For this demo, we assume the client manages the lock object state or we store it
        // But Redlock requires the Lock object to release.
        // Simplification: We'll implement a wrapper that stores active locks by ID if needed,
        // or just expose the unlock if we had the lock object.
        // For stateless API, we'd need to reconstruct the lock or use a token.
        // Redlock's `unlock` needs the lock instance.

        // workaround for demo: The proper way is to extend the LockManager to track local locks
        // or use the script to unlock with just the value.
        await lockManager.release(resource, value);
        res.sendStatus(204);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    logger.info(`Distributed Lock Manager running on port ${PORT}`);
});
