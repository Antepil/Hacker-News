
import { prisma } from '@/lib/db';
import { generateStorySummary } from '@/lib/ai/service';
import { HnItem } from '@/lib/types';
import { fetchStoryWithComments, stripHtml } from '@/lib/ai/fetcher';

async function main() {
    console.log('Starting Retry Mechanism for Failed AI Summaries...');

    // 1. Find stories that have content/comments but NO AI Summary
    const failedStories = await prisma.story.findMany({
        where: {
            commentsDump: { not: null },
            aiSummary: null // This finds stories where the relation is missing
        },
        orderBy: { postedAt: 'desc' }
    });

    if (failedStories.length === 0) {
        console.log('No failed stories found. All eligible stories have summaries.');
        return;
    }

    console.log(`Found ${failedStories.length} stories pending retry.`);

    // 2. Process in batches
    const BATCH_SIZE = 5;

    for (let i = 0; i < failedStories.length; i += BATCH_SIZE) {
        const batch = failedStories.slice(i, i + BATCH_SIZE);
        console.log(`\n--- Retrying Batch ${Math.floor(i / BATCH_SIZE) + 1} (${batch.length} stories) ---`);

        await Promise.all(batch.map(async (dbStory) => {
            console.log(`Retrying: ${dbStory.title.substring(0, 40)}... (ID: ${dbStory.id})`);

            const hnItem: HnItem = {
                id: dbStory.id,
                title: dbStory.title,
                url: dbStory.url || undefined,
                author: dbStory.author || undefined,
                postedAt: dbStory.postedAt,
                points: dbStory.points,
                numComments: dbStory.numComments,
                commentsDump: dbStory.commentsDump!
            };

            // Allow empty string (0 comments)
            if (dbStory.commentsDump === null) return;

            try {
                // 1. Fetch fresh data (in case it's an Ask HN with missing text)
                const freshData = await fetchStoryWithComments(dbStory.id);
                let articleContent = '';

                if (freshData && freshData.story.text) {
                    console.log(`  > [${dbStory.id}] Found Ask HN text. Updating DB...`);
                    const cleanedText = stripHtml(freshData.story.text).trim();
                    articleContent = cleanedText;

                    // Update DB with the missing text
                    await prisma.story.update({
                        where: { id: dbStory.id },
                        data: { text: freshData.story.text }
                    });
                }

                // 2. Generate Summary (using articleContent if available)
                const summary = await generateStorySummary(hnItem, dbStory.commentsDump!, articleContent);

                if (summary) {
                    console.log(`  > [${dbStory.id}] Recovered! Saving...`);
                    await prisma.aiSummary.create({
                        data: {
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
                    console.warn(`  > [${dbStory.id}] Retry Failed (AI returned null).`);
                }

            } catch (e) {
                console.error(`  > [${dbStory.id}] Error during retry:`, e);
            }
        }));
    }

    console.log('\nRetry job complete.');
}

main()
    .catch(console.error)
    .finally(async () => await prisma.$disconnect());
