
import { prisma } from '../src/lib/db';

async function main() {
    console.log('Clearing database...');

    // Delete AiSummary first due to foreign key constraints (if any, though cascade might handle it)
    const deletedSummaries = await prisma.aiSummary.deleteMany({});
    console.log(`Deleted ${deletedSummaries.count} AI Summaries.`);

    const deletedStories = await prisma.story.deleteMany({});
    console.log(`Deleted ${deletedStories.count} Stories.`);

    const deletedLocks = await prisma.cronLock.deleteMany({});
    console.log(`Deleted ${deletedLocks.count} Cron Locks.`);

    console.log('Database cleared successfully.');
}

main()
    .catch(e => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
