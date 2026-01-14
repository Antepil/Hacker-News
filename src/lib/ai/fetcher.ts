import { HnItem } from '@/lib/types';

const HN_BASE_URL = 'https://hacker-news.firebaseio.com/v0';

/**
 * Validates and sanitizes a potentially nullable item
 */
const isValidItem = (item: any): item is HnItem => {
    return item && !item.deleted && !item.dead;
};

/**
 * Fetch raw item from HN API
 */
export async function fetchHnItem(id: number): Promise<HnItem | null> {
    try {
        const res = await fetch(`${HN_BASE_URL}/item/${id}.json`, {
            next: { revalidate: 3600 } // Cache for 1 hour
        });

        if (!res.ok) return null;

        const data = await res.json();
        if (!isValidItem(data)) return null;

        return data;
    } catch (e) {
        console.error(`Failed to fetch HN item ${id}:`, e);
        return null;
    }
}

/**
 * Fetch Top Stories IDs
 */
export async function fetchTopStoryIds(limit = 30): Promise<number[]> {
    try {
        const res = await fetch(`${HN_BASE_URL}/topstories.json`, { next: { revalidate: 300 } });
        if (!res.ok) throw new Error('Failed to fetch top stories');

        const ids = await res.json();
        return ids.slice(0, limit);
    } catch (error) {
        console.error('Error fetching top stories:', error);
        return [];
    }
}

/**
 * Fetch Story + Top Comments (recursive text extraction) for AI Context
 * returns { story: HnItem, commentsText: string[] }
 */
export async function fetchStoryWithComments(id: number): Promise<{ story: HnItem, commentsText: string[] } | null> {
    const story = await fetchHnItem(id);
    if (!story || !story.kids) return story ? { story, commentsText: [] } : null;

    // Fetch top 10 comment threads
    const topCommentIds = story.kids.slice(0, 10);
    const commentsText: string[] = [];

    // Parallel fetch top level comments
    const commentPromises = topCommentIds.map(cid => fetchHnItem(cid));
    const comments = await Promise.all(commentPromises);

    // Extract meaningful text (simple version: just top level)
    // In a real "deep" version we might traverse, but for summary top level is usually best signal
    comments.forEach(c => {
        if (c && c.text) {
            // Basic cleanup of HTML decoding if needed, though LLM handles it well
            commentsText.push(c.text);
        }
    });

    return { story, commentsText };
}
