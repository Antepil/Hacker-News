import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { fetchTopStoryIds, fetchStoryWithComments, stripHtml } from '@/lib/ai/fetcher';
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
                        points: story.points || 0,
                        numComments: story.numComments || 0,
                    },
                    create: {
                        id: story.id,
                        title: story.title || 'Untitled',
                        url: story.url,
                        author: story.author,
                        postedAt: story.postedAt || Math.floor(Date.now() / 1000),
                        points: story.points || 0,
                        numComments: story.numComments || 0,
                        kids: JSON.stringify(story.kids || []),
                        text: story.text || null, // Capture Ask HN text
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
                // But for "Ask HN" with internal text, we want to use that.

                // Fallback Logic:
                // 1. If scrape failed or no URL, AND we have story.text, use story.text (cleaned)
                // 2. Otherwise strict skip if scrape failed and no text.

                if (!articleContent && story.text) {
                    console.log(`[Process-News] Using internal text (Ask HN) for ${id}...`);
                    articleContent = stripHtml(story.text).trim();
                }

                if (!articleContent && scrapeStatus === 'failed') {
                    console.log(`[Process-News] Skipping AI for ${id} due to scrape failure and no internal text.`);
                    results.push({ id, status: 'skipped_scrape_failed' });
                    continue;
                }

                // Step 4: AI Processing
                console.log(`[Process-News] Generating AI for ${id}...`);
                const summary = await generateStorySummary(story, story.commentsDump || '', articleContent);

                if (summary) {
                    // Step 5: Upsert DB
                    await prisma.aiSummary.create({
                        data: {
                            storyId: story.id,
                            technical: summary.technical,
                            technicalZh: summary.technicalZh, // New
                            layman: summary.layman,
                            laymanZh: summary.laymanZh, // New
                            comments: summary.comments,
                            commentsZh: summary.commentsZh, // New
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
