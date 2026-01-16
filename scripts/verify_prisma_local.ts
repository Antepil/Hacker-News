
import { prisma } from '@/lib/db';

async function verifyPrismaLocal() {
    console.log('Verifying Prisma Client locally...');
    try {
        const stories = await prisma.story.findMany({
            orderBy: { postedAt: 'desc' },
            take: 1
        });
        console.log('Success! Found story:', stories[0]?.title);
        console.log('Prisma Client is updated correctly in the filesystem.');
    } catch (e) {
        console.error('Local Prisma check failed:', e);
    }
}
verifyPrismaLocal();
