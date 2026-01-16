import { prisma } from '../src/lib/db';
import { fetchTopStoryIds } from '../src/lib/hn-service';
import { fetchStoryWithComments } from '../src/lib/ai/fetcher';

async function main() {
    console.log('Starting manual job...');

    // 1. Fetch Top Stories
    const allIds = await fetchTopStoryIds();
    console.log(`Fetched ${allIds.length} IDs.`);

    const targetIds = allIds.slice(0, 30); // Top 30
    console.log(`Processing top 30 stories...`);

    let processedCount = 0;
    let updatedCount = 0;
    let newCount = 0;

    // Parallel processing with concurrency limit
    const batchSize = 5;
    for (let i = 0; i < targetIds.length; i += batchSize) {
        const batch = targetIds.slice(i, i + batchSize);
        await Promise.all(batch.map(async (id) => {
            try {
                // Check if exists
                const existing = await prisma.story.findUnique({
                    where: { id },
                });

                // Fetch Full Story + Comments using AI Fetcher (it has the logic for commentsDump)
                const result = await fetchStoryWithComments(id);
                if (!result) return;
                const { story: item } = result;

                if (existing) {
                    // Update regardless of status for this manual run to ensure freshness
                    if (item && !item.deleted && !item.dead) {
                        let domain = '';
                        if (item.url) {
                            try {
                                const u = new URL(item.url);
                                domain = u.hostname.replace('www.', '');
                            } catch (e) { }
                        }

                        // We must exercise the 'status' field to prove it works
                        await prisma.story.update({
                            where: { id },
                            data: {
                                title: item.title || 'Untitled',
                                url: item.url,
                                author: item.author,
                                points: item.points || 0,
                                postedAt: item.postedAt,
                                numComments: item.numComments || 0,
                                domain,
                                kids: item.kids ? JSON.stringify(item.kids) : undefined,
                                commentsDump: item.commentsDump, // Store Comments Dump
                                // Update status if needed, or keep it
                            }
                        });
                        updatedCount++;
                    }
                } else {
                    // New Story
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
                                author: item.author,
                                points: item.points || 0,
                                postedAt: item.postedAt,
                                numComments: item.numComments || 0,
                                domain,
                                kids: item.kids ? JSON.stringify(item.kids) : undefined,
                                commentsDump: item.commentsDump, // Store Comments Dump
                                status: 'PENDING',
                            }
                        });
                        newCount++;
                    }
                }
                processedCount++;
            } catch (e) {
                console.error(`Error processing ${id}:`, e);
            }
        }));
    }

    // Retention
    const totalCount = await prisma.story.count();
    console.log(`Total stories: ${totalCount}`);

    if (totalCount > 60) {
        const deleteAmount = totalCount - 60;
        const storiesToDelete = await prisma.story.findMany({
            orderBy: { updatedAt: 'asc' },
            take: deleteAmount,
            select: { id: true }
        });

        if (storiesToDelete.length > 0) {
            await prisma.story.deleteMany({
                where: {
                    id: { in: storiesToDelete.map(s => s.id) }
                }
            });
            console.log(`Deleted ${storiesToDelete.length} old stories.`);
        }
    }

    console.log(`Job Complete. Processed: ${processedCount}, New: ${newCount}, Updated: ${updatedCount}, Total: ${await prisma.story.count()}`);
}

main()
    .catch(e => console.error(e))
    .finally(async () => {
        await prisma.$disconnect();
    });
