
import { prisma } from '../src/lib/db';

async function main() {
    console.log('Verifying comments dump storage...');

    // Check up to 5 stories to find one with good comments
    const stories = await prisma.story.findMany({
        where: { commentsDump: { not: null } },
        orderBy: { updatedAt: 'desc' },
        take: 5
    });

    if (stories.length === 0) {
        console.error('No stories found with commentsDump!');
        process.exit(1);
    }

    console.log(`Checking ${stories.length} stories for comments...`);

    for (const story of stories) {
        if (!story.commentsDump) continue;

        const dump = story.commentsDump;

        // It should start with [Comment 1]:
        if (dump.includes('[Comment 1]:')) {
            console.log(`Story: ${story.title.substring(0, 30)}... (ID: ${story.id}) - Found Formatted Comments`);
            console.log('--- PREVIEW ---');
            console.log(dump.substring(0, 300) + '...');
            console.log('---------------');
            break;
        } else {
            console.log(`Story: ${story.title.substring(0, 30)}... (ID: ${story.id}) - commentsDump exists but format might be old/JSON.`);
        }
    }
}

main()
    .catch(e => console.error(e))
    .finally(async () => {
        await prisma.$disconnect();
    });
