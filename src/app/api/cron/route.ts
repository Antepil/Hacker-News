import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { fetchTopStoryIds, fetchStoryWithComments } from '@/lib/ai/fetcher';
import { generateStorySummary } from '@/lib/ai/service';
import { scrapeStoryContent } from '@/lib/ai/scraper';

// Prevent vercel timeouts by limiting batch size
const BATCH_SIZE = 5;

export async function GET() {
    try {
        const allIds = await fetchTopStoryIds(50); // Get top 50 to ensure we find candidates

        // Find IDs that are NOT in our DB or have no AI summary
        const existingStories = await prisma.story.findMany({
            where: { id: { in: allIds }, aiSummary: { isNot: null } },
            select: { id: true }
        });

        const existingIds = new Set(existingStories.map((s: { id: number }) => s.id));
        const candidates = allIds.filter(id => !existingIds.has(id));

        // Process a batch
        const batch = candidates.slice(0, BATCH_SIZE);
        console.log(`[Cron] Processing batch of ${batch.length} stories: ${batch.join(', ')}`);

        const results = [];

        for (const id of batch) {
            // 1. Fetch Details & Comments
            const data = await fetchStoryWithComments(id);
            if (!data) continue;
            const { story, commentsText } = data;

            // 2. Scrape Article Content
            console.log(`[Cron] Scraping content for ${id} (${story.url})...`);
            const articleContent = await scrapeStoryContent(story.url);

            // 3. Generate AI content
            console.log(`[Cron] Generating AI for ${id}...`);
            const summary = await generateStorySummary(story, commentsText, articleContent);

            if (summary) {
                // 3. Save to DB (Transactional)
                await prisma.$transaction(async (tx: any) => {
                    // Upsert Story
                    await tx.story.upsert({
                        where: { id: story.id },
                        update: {
                            score: story.score || 0,
                            descendants: story.descendants || 0,
                        },
                        create: {
                            id: story.id,
                            title: story.title || 'Untitled',
                            url: story.url,
                            by: story.by,
                            time: story.time || Math.floor(Date.now() / 1000),
                            score: story.score || 0,
                            descendants: story.descendants || 0,
                            kids: JSON.stringify(story.kids || []),
                            // titleZh: will be translated on-demand or separate worker
                        }
                    });

                    // Create Summary
                    await tx.aiSummary.create({
                        data: {
                            storyId: story.id,
                            technical: summary.technical,
                            layman: summary.layman,
                            comments: summary.comments,
                            keywords: JSON.stringify(summary.keywords),
                            sentiment: JSON.stringify(summary.sentiment)
                        }
                    });
                });
                results.push({ id, status: 'success' });
            } else {
                results.push({ id, status: 'failed_generation' });
            }
        }

        return NextResponse.json({ processed: results });

    } catch (error) {
        console.error('Cron job failed:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
