import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { acquireLock, releaseLock } from '@/lib/cron-lock';
import { fetchTopStoryIds, fetchItem } from '@/lib/hn-service';

export const dynamic = 'force-dynamic'; // Ensure this route is not cached by Next.js by default
export const maxDuration = 60; // Allow 60 seconds (Vercel max for Hobby)

export async function GET() {
    const JOB_ID = 'fetch_stories';
    const LOCK_TTL = 120; // 2 minutes lock

    // 1. Concurrency Control
    console.log('[Cron] Acquiring lock...');
    const locked = await acquireLock(JOB_ID, LOCK_TTL);
    console.log('[Cron] Lock status:', locked);
    // return NextResponse.json({ status: 'locked', locked });
    if (!locked) {
        return NextResponse.json(
            { error: 'Job already running or locked', success: false },
            { status: 429 }
        );
    }

    try {
        console.log('[Cron] Started fetching stories...');

        // 2. Fetch Top Stories
        const allIds = await fetchTopStoryIds();
        console.log('[Cron] Fetched IDs count:', allIds.length);
        const targetIds = allIds.slice(0, 30); // Top 30

        let processedCount = 0;
        let updatedCount = 0;
        let newCount = 0;

        // 3. Process each story
        // Parallel processing with concurrency limit (e.g., 5) to avoid rate limiting
        const batchSize = 5;
        for (let i = 0; i < targetIds.length; i += batchSize) {
            const batch = targetIds.slice(i, i + batchSize);
            await Promise.all(batch.map(async (id) => {
                // Check if exists
                const existing = await prisma.story.findUnique({
                    where: { id },
                });

                if (existing) {
                    if (existing.status === 'COMPLETED') {
                        // Update timestamp to keep it fresh
                        await prisma.story.update({
                            where: { id },
                            data: {
                                score: existing.score, // Touch to update updatedAt
                            }
                        });

                        // Re-fetch details for stats updates
                        const item = await fetchItem(id);
                        if (item) {
                            await prisma.story.update({
                                where: { id },
                                data: {
                                    score: item.score || 0,
                                    descendants: item.descendants || 0,
                                }
                            });
                        }
                        updatedCount++;
                    } else {
                        // Retry pending/incomplete
                        const item = await fetchItem(id);
                        if (item && !item.deleted && !item.dead) {
                            let domain = '';
                            if (item.url) {
                                try {
                                    const u = new URL(item.url);
                                    domain = u.hostname.replace('www.', '');
                                } catch (e) { }
                            }

                            await prisma.story.update({
                                where: { id },
                                data: {
                                    title: item.title || 'Untitled',
                                    url: item.url,
                                    by: item.by,
                                    score: item.score || 0,
                                    time: item.time,
                                    descendants: item.descendants || 0,
                                    domain,
                                    kids: item.kids ? JSON.stringify(item.kids) : undefined,
                                }
                            });
                            updatedCount++;
                        }
                    }
                } else {
                    // New Story
                    const item = await fetchItem(id);
                    if (item && !item.deleted && !item.dead) {
                        let domain = '';
                        if (item.url) {
                            try {
                                const u = new URL(item.url);
                                domain = u.hostname.replace('www.', '');
                            } catch (e) { }
                        }

                        await prisma.story.create({
                            data: {
                                id: item.id,
                                title: item.title || 'Untitled',
                                url: item.url,
                                by: item.by,
                                score: item.score || 0,
                                time: item.time,
                                descendants: item.descendants || 0,
                                domain,
                                kids: item.kids ? JSON.stringify(item.kids) : undefined,
                                status: 'PENDING',
                            }
                        });
                        newCount++;
                    }
                }
                processedCount++;
            }));
        }

        // 4. Retention Policy - Max 60 stories
        // Delete stories that are NOT in the "keep list" or just delete oldest `n`?
        // Requirement: "storage total 60".
        // Simplest strategy: Count all. If > 60, delete (Count - 60) oldest.

        const totalCount = await prisma.story.count();
        let deletedCount = 0;

        if (totalCount > 60) {
            const deleteAmount = totalCount - 60;
            // Find oldest by updatedAt (least recently touched)
            const storiesToDelete = await prisma.story.findMany({
                orderBy: { updatedAt: 'asc' },
                take: deleteAmount,
                select: { id: true }
            });

            if (storiesToDelete.length > 0) {
                await prisma.story.deleteMany({
                    where: {
                        id: {
                            in: storiesToDelete.map((s: { id: number }) => s.id)
                        }
                    }
                });
                deletedCount = storiesToDelete.length;
            }
        }

        return NextResponse.json({
            success: true,
            processed: processedCount,
            new: newCount,
            updated: updatedCount,
            deleted: deletedCount,
            total: totalCount - deletedCount
        });

    } catch (error) {
        console.error('[Cron] Error:', error);
        return NextResponse.json(
            { error: 'Internal Server Error', details: error instanceof Error ? error.message : String(error) },
            { status: 500 }
        );
    } finally {
        console.log('[Cron] Releasing lock');
        await releaseLock(JOB_ID);
    }
}
