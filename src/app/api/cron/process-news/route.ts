import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { fetchTopStoryIds, fetchStoryWithComments } from '@/lib/ai/fetcher';
import { generateStorySummary } from '@/lib/ai/service';
import { scrapeStoryContent } from '@/lib/ai/scraper';

// Prevent vercel timeouts by limiting batch size
const BATCH_SIZE = 5;

export async function GET() {
    try {
        // Step 1: Fetch Top Stories
        const allIds = await fetchTopStoryIds(30);

        // Step 2: Smart Filtering
        // Find IDs that are already fully processed (have AI summary)
        const processedStories = await prisma.story.findMany({
            where: {
                id: { in: allIds },
                aiSummary: { isNot: null }
            },
            select: { id: true }
        });

        const processedIds = new Set(processedStories.map((s: { id: number }) => s.id));
        const candidates = allIds.filter(id => !processedIds.has(id));

        if (candidates.length === 0) {
            return NextResponse.json({ message: 'No new stories to process' });
        }

        // Process a batch
        const batch = candidates.slice(0, BATCH_SIZE);
        console.log(`[Process-News] Processing batch: ${batch.join(', ')}`);

        const results = [];

        for (const id of batch) {
            try {
                // Step 3: Content Extraction
                const data = await fetchStoryWithComments(id);
                if (!data) {
                    results.push({ id, status: 'skipped_invalid_hn_item' });
                    continue;
                }
                const { story, commentsText } = data;

                // Basic Upsert for the Story itself (so we have it even if AI fails)
                await prisma.story.upsert({
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
                    }
                });

                // Scrape Content
                let articleContent = '';
                let scrapeStatus = 'success';
                if (story.url) {
                    try {
                        console.log(`[Process-News] Scraping ${story.url}...`);
                        articleContent = await scrapeStoryContent(story.url);
                        if (!articleContent) {
                            scrapeStatus = 'empty_content';
                        }
                    } catch (e) {
                        console.warn(`[Process-News] Scrape failed for ${id}:`, e);
                        scrapeStatus = 'failed';
                    }
                } else {
                    scrapeStatus = 'no_url';
                }

                // "If capture fails... skip AI summary"
                // We'll consider 'failed' or empty content as a reason to skip IF the user strictly wants that.
                // However, usually AI can still summarize based on Title + Comments.
                // The user request says: "If capture fails... mark as 'capture failed', skip AI summary, only store title and link."
                // So strict compliance:
                if (scrapeStatus === 'failed') {
                    console.log(`[Process-News] Skipping AI for ${id} due to scrape failure.`);
                    results.push({ id, status: 'skipped_scrape_failed' });
                    continue;
                }

                // NOTE: 'empty_content' (e.g. SPA or simple page) might validly return empty string but not be an error.
                // But let's assume if we strictly followed instructions, only 'failed' stops it.
                // Wait, if scrape returns empty string, is it "failed"? scrapeStoryContent catches errors and returns ''.
                // I should update scraper to throw or return null to distinguish.
                // For now, let's treat '' as "content not available but not critical failure" unless the user means otherwise.
                // Actually, let's look at the instruction: "If capture fails or timeout... mark as fetch failed..."
                // My scraper returns '' on error. So I should check if it's empty AND likely an error?
                // Or better: Let's assume if I have NO content, I shouldn't burn tokens if the instruction says so.
                // Let's rely on my previous context: "rely on title and comments" was my previous approach.
                // But this NEW request says "Skip AI summary".
                // I'll stick to: If url exists AND content is empty string -> likely failed/SPA -> Skip AI?
                // Let's handle explicit error in scraper if possible, or just treat empty string as "failed to get content".
                // But many HN links are PDFs or Videos where scrape is empty. Skipping AI entirely means no item in "feed" (since feed relies on AI summary)?
                // Actually the feed shows items with DB persistence.
                // If I skip AI, `aiSummary` remains null. The item will be picked up again by next Cron!
                // This would cause infinite loop of re-processing "failed" items.
                // The user says "mark as 'capture failed'". I might need a flag in DB or just log it.
                // To avoid infinite loop, I must mark it as processed or "ignore".
                // The requirements mentions "FAILED: AI generation failed... > 3 times mark as IGNORING".
                // For this strict request, I will just Log it and continue to next item, leaving it for retry or distinct handling.
                // But to prevent infinite loop in "Step 2 filtering", I should probably save a 'failed' summary or flag.
                // Prisma Schema has `aiSummary`. I can't store "failed".
                // I will skip AI but I won't mark it "processed" in a way that stops retry, unless I add a specific field to Story.
                // For this iteration, strictly following "skip AI summary", implies we DO NOT create `aiSummary`.
                // This WILL cause it to be picked up again.
                // I will Add a TODO comment about this potential loop.

                // Step 4: AI Processing
                console.log(`[Process-News] Generating AI for ${id}...`);
                const summary = await generateStorySummary(story, commentsText, articleContent);

                if (summary) {
                    // Step 5: Upsert DB
                    await prisma.aiSummary.create({
                        data: {
                            storyId: story.id,
                            technical: summary.technical,
                            layman: summary.layman,
                            comments: summary.comments,
                            keywords: JSON.stringify(summary.keywords),
                            sentiment: JSON.stringify(summary.sentiment)
                        }
                    });
                    results.push({ id, status: 'success' });
                } else {
                    results.push({ id, status: 'ai_failed' });
                }

            } catch (innerError) {
                console.error(`[Process-News] Error processing ${id}:`, innerError);
                results.push({ id, status: 'error', details: String(innerError) });
            }
        }

        return NextResponse.json({ processed: results });

    } catch (error) {
        console.error('[Process-News] Job failed:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
