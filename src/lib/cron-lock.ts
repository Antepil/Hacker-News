import { prisma } from '@/lib/db';

export async function acquireLock(jobId: string, ttlSeconds: number): Promise<boolean> {
    const now = new Date();
    const expiresAt = new Date(now.getTime() + ttlSeconds * 1000);

    try {
        // Try to create the lock
        await prisma.cronLock.create({
            data: {
                id: jobId,
                lockedAt: now,
                expiresAt: expiresAt,
            },
        });
        return true;
    } catch (error) {
        // If creation fails, check if existing lock is expired
        const existingLock = await prisma.cronLock.findUnique({
            where: { id: jobId },
        });

        if (existingLock && existingLock.expiresAt < now) {
            // Lock expired, take it over
            await prisma.cronLock.update({
                where: { id: jobId },
                data: {
                    lockedAt: now,
                    expiresAt: expiresAt,
                },
            });
            return true;
        }

        return false; // Locked and active
    }
}

export async function releaseLock(jobId: string): Promise<void> {
    try {
        await prisma.cronLock.delete({
            where: { id: jobId },
        });
    } catch (error) {
        // Ignore if already deleted
    }
}
