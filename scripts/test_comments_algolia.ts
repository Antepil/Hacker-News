import { fetchStoryWithComments, fetchTopStoryIds } from '../src/lib/ai/fetcher';
import { prisma } from '../src/lib/db';

async function main() {
    console.log('Testing Algolia Comments Fetching...');

    // 1. Get a Top Story ID
    const ids = await fetchTopStoryIds(1);
    const storyId = ids[0];
    console.log(`Target Story ID: ${storyId}`);

    // 2. Fetch Story + Comments (Algolia Optimized)
    const result = await fetchStoryWithComments(storyId);

    if (!result) {
        console.error('Failed to fetch story');
        return;
    }

    const { story, commentsText } = result;
    console.log(`Title: ${story.title}`);
    console.log(`Comments Found: ${commentsText.length}`);
    if (commentsText.length > 0) {
        console.log(`Sample Comment: ${commentsText[0].substring(0, 50)}...`);
    }

    // 3. Save to DB for verification (mocking AI Summary)
    // We need to ensure the story exists first
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
            postedAt: story.postedAt || Math.floor(Date.now() / 1000),
            points: story.points || 0,
            numComments: story.numComments || 0,
            status: 'PENDING'
        }
    });

    // Save mock AI summary containing the fetched comments
    // Using 'layman' field to store a note about this test
    await prisma.aiSummary.upsert({
        where: { storyId: story.id },
        update: {
            comments: commentsText.join('\n\n---\n\n'), // Store actual comments here
            layman: 'Algolia Comments Test: Data successfully fetched via single-request API.',
        },
        create: {
            storyId: story.id,
            technical: 'Mock Technical Summary',
            layman: 'Algolia Comments Test: Data successfully fetched via single-request API.',
            comments: commentsText.join('\n\n---\n\n'), // Store actual comments here
            keywords: JSON.stringify(['algolia', 'test', 'comments']),
            sentiment: JSON.stringify({ constructive: 0, technical: 0, controversial: 0 }),
        }
    });

    console.log('Saved to DB. Check Prisma Studio -> AiSummary table.');
}

main()
    .catch(e => console.error(e))
    .finally(async () => {
        await prisma.$disconnect();
    });
