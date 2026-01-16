
import { prisma } from '@/lib/db';
import { generateStorySummary } from '@/lib/ai/service'; // This uses the updated service
import { HnItem } from '@/lib/types';

import { stripHtml } from '@/lib/ai/fetcher';

// Helper function to process a list of stories in parallel batches
async function processStories(stories: any[], label: string = 'Processing') {
    const BATCH_SIZE = 5; // Concurrency limit

    for (let i = 0; i < stories.length; i += BATCH_SIZE) {
        const batch = stories.slice(i, i + BATCH_SIZE);
        console.log(`\n--- ${label} Batch ${Math.floor(i / BATCH_SIZE) + 1} (${batch.length} stories) ---`);

        await Promise.all(batch.map(async (dbStory: any) => {
            if (!dbStory.commentsDump) return;

            console.log(`${label}: ${dbStory.title.substring(0, 40)}... (ID: ${dbStory.id})`);

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
                // Determine article content: Use internal text (Ask HN) if available, otherwise empty (AI relies on fetch or just title/comments)
                let articleContent = '';
                if (dbStory.text) {
                    articleContent = stripHtml(dbStory.text).trim();
                }

                const summary = await generateStorySummary(hnItem, dbStory.commentsDump, articleContent);

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
    }
}

async function main() {
    console.log('Starting AI Summary Backfill (Auto-Retry Enabled)...');

    // 1. Initial Pass: Process ALL eligible stories (forcing refresh/update)
    const allStories = await prisma.story.findMany({
        where: { commentsDump: { not: null } },
        orderBy: { updatedAt: 'desc' }
    });

    console.log(`Found ${allStories.length} stories eligible for initial processing.`);
    await processStories(allStories, 'Initial Processing');

    // 2. Retry Loop: Check for missing summaries and retry
    const MAX_RETRIES = 5;
    let attempt = 1;

    while (attempt <= MAX_RETRIES) {
        console.log(`\n[Check Phase] Verifying completion status (Attempt ${attempt}/${MAX_RETRIES})...`);

        // Find stories that HAVE comments but NO AiSummary relation
        const failedStories = await prisma.story.findMany({
            where: {
                commentsDump: { not: null },
                aiSummary: null
            },
            orderBy: { postedAt: 'desc' }
        });

        if (failedStories.length === 0) {
            console.log(`\n✅ All eligible stories have been successfully summarized!`);
            break;
        }

        console.log(`⚠️ Found ${failedStories.length} stories missing summaries. Retrying...`);

        // Wait a bit before retrying to let API rate limits cool down
        if (attempt > 1) {
            console.log('Waiting 3s before next retry...');
            await new Promise(r => setTimeout(r, 3000));
        }

        await processStories(failedStories, `Retry Attempt ${attempt}`);

        attempt++;
    }

    if (attempt > MAX_RETRIES) {
        console.warn(`\n❌ Max retries reached. Some stories may still be missing summaries.`);
    }

    console.log('Backfill job complete.');
}

main()
    .catch(console.error)
    .finally(async () => await prisma.$disconnect());
