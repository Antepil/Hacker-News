
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const HN_BASE_URL = 'https://hacker-news.firebaseio.com/v0';

async function main() {
    try {
        console.log('Fetching Top 30 Stories...');
        const res = await fetch(`${HN_BASE_URL}/topstories.json`);
        const allIds = await res.json();
        const top30 = allIds.slice(0, 30);

        console.log(`Found IDs: ${top30.join(', ')}`);

        for (const id of top30) {
            const itemRes = await fetch(`${HN_BASE_URL}/item/${id}.json`);
            const item = await itemRes.json();

            if (item && !item.deleted && !item.dead) {
                console.log(`Upserting: ${item.title}`);
                await prisma.story.upsert({
                    where: { id: item.id },
                    update: {}, // Don't update if exists, just ensure it's there
                    create: {
                        id: item.id,
                        title: item.title || 'Untitled',
                        url: item.url,
                        by: item.by || 'unknown',
                        time: item.time || Math.floor(Date.now() / 1000),
                        score: item.score || 0,
                        descendants: item.descendants || 0,
                        kids: JSON.stringify(item.kids || []),
                    }
                });
            }
        }
        console.log('Done!');
    } catch (e) {
        console.error(e);
    } finally {
        await prisma.$disconnect();
    }
}

main();
