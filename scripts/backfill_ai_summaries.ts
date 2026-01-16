
import { prisma } from '@/lib/db';
import { generateStorySummary } from '@/lib/ai/service'; // This uses the updated service
import { HnItem } from '@/lib/types';

async function main() {
    console.log('Starting AI Summary Backfill...');

    // 1. Fetch stories that have comments but maybe need AI summary
    // For this task, let's just process the top 20 latest stories to save tokens/time
    // independent of whether they have a summary or not (forcing refresh)
    const stories = await prisma.story.findMany({
        where: {
            commentsDump: { not: null }
        },
        orderBy: { updatedAt: 'desc' },
        // take: 20 // Removed to process all found stories
    });

    console.log(`Found ${stories.length} stories eligible for AI processing.`);

    // Parallel processing with batch limit
    const BATCH_SIZE = 5; // Concurrency limit

    for (let i = 0; i < stories.length; i += BATCH_SIZE) {
        const batch = stories.slice(i, i + BATCH_SIZE);
        console.log(`\n--- Processing Batch ${Math.floor(i / BATCH_SIZE) + 1} (${batch.length} stories) ---`);

        await Promise.all(batch.map(async (dbStory) => {
            if (!dbStory.commentsDump) return;

            console.log(`Processing: ${dbStory.title.substring(0, 40)}... (ID: ${dbStory.id})`);

            const hnItem: HnItem = {
                id: dbStory.id,
                title: dbStory.title,
                url: dbStory.url || undefined,
                author: dbStory.author || undefined,
                postedAt: dbStory.postedAt,
                points: dbStory.points,
                numComments: dbStory.numComments,
                commentsDump: dbStory.commentsDump
            };

            try {
                // Pass empty content as before
                const summary = await generateStorySummary(hnItem, dbStory.commentsDump, '');

                if (summary) {
                    console.log(`  > [${dbStory.id}] Success! Saving...`);
                    await prisma.aiSummary.upsert({
                        where: { storyId: dbStory.id },
                        update: {
                            technical: summary.technical,
                            technicalZh: summary.technicalZh,
                            layman: summary.layman,
                            laymanZh: summary.laymanZh,
                            comments: summary.comments,
                            commentsZh: summary.commentsZh,
                            keywords: JSON.stringify(summary.keywords),
                            sentiment: JSON.stringify(summary.sentiment)
                        },
                        create: {
                            storyId: dbStory.id,
                            technical: summary.technical,
                            technicalZh: summary.technicalZh,
                            layman: summary.layman,
                            laymanZh: summary.laymanZh,
                            comments: summary.comments,
                            commentsZh: summary.commentsZh,
                            keywords: JSON.stringify(summary.keywords),
                            sentiment: JSON.stringify(summary.sentiment)
                        }
                    });
                } else {
                    console.warn(`  > [${dbStory.id}] Skipped/Failed (No result).`);
                }

            } catch (e) {
                console.error(`  > [${dbStory.id}] Error:`, e);
            }
        }));

        // Optional small wait between batches to be nice to API
        // await new Promise(r => setTimeout(r, 1000));
    }

    console.log('Backfill complete.');
}

main();
