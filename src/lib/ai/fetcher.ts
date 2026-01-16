import { HnItem, HnComment } from '@/lib/types';

const ALGOLIA_BASE_URL = 'http://hn.algolia.com/api/v1';

/**
 * Validates and sanitizes a potentially nullable item
 */
const isValidItem = (item: any): item is HnItem => {
    // Algolia items might not have 'dead'/'deleted' fields explicitly if they are just filtered out,
    // but check if they exist.
    return item && item.id;
};

/**
 * Fetch raw item from Algolia API
 */
export async function fetchHnItem(id: number): Promise<HnItem | null> {
    try {
        const res = await fetch(`${ALGOLIA_BASE_URL}/items/${id}`, {
            next: { revalidate: 3600 }
        });

        if (!res.ok) return null;

        const data = await res.json();
        // Map Algolia -> HnItem
        return {
            id: data.id,
            title: data.title,
            url: data.url,
            author: data.author,
            points: data.points,
            postedAt: data.created_at_i,
            numComments: data.children ? data.children.length : 0,
            kids: data.children ? data.children.map((c: any) => c.id) : [],
            type: data.type,
            text: data.text
        };
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
        const res = await fetch(`${ALGOLIA_BASE_URL}/search?tags=front_page&hitsPerPage=${limit}`, { next: { revalidate: 300 } });
        if (!res.ok) throw new Error('Failed to fetch top stories');

        const data = await res.json();
        return data.hits.map((h: any) => Number(h.objectID));
    } catch (error) {
        console.error('Error fetching top stories:', error);
        return [];
    }
}

/**
 * Fetch Story + Top Comments (recursive text extraction) for AI Context
 * returns { story: HnItem, commentsText: string[] }
 * Optimized for Algolia: Single request returns nested children.
 */
// Helper to strip HTML tags (basic approach)
function stripHtml(html: string): string {
    return html.replace(/<[^>]*>?/gm, '')
        .replace(/&quot;/g, '"')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&#x27;/g, "'")
        .replace(/&#x2F;/g, "/");
}

/**
 * Fetch Story + Top Comments (recursive text extraction) for AI Context
 * returns { story: HnItem, commentsText: string[] }
 * Optimized for Algolia: Single request returns nested children.
 */
export async function fetchStoryWithComments(id: number): Promise<{ story: HnItem, commentsText: string[] } | null> {
    try {
        const res = await fetch(`${ALGOLIA_BASE_URL}/items/${id}`, {
            next: { revalidate: 3600 }
        });

        if (!res.ok) return null;
        const data = await res.json();

        // 1. Process Comments for AI Model (Anonymous, Numbered)
        // User wants: "[Comment 1]: ... \n [Comment 2]: ..."
        let formattedComments = '';
        const commentsText: string[] = [];

        if (data.children && Array.isArray(data.children)) {
            // Take top 10 top-level comments
            const topComments = data.children.slice(0, 10);

            topComments.forEach((c: any, index: number) => {
                if (c.text) {
                    const cleanText = stripHtml(c.text).trim();
                    if (cleanText) {
                        formattedComments += `[Comment ${index + 1}]: ${cleanText}\n`;
                        commentsText.push(cleanText); // Keep flat array for compatibility if needed
                    }
                }
            });
        }

        // 2. Construct Story Object
        const story: HnItem = {
            id: data.id,
            title: data.title,
            url: data.url,
            author: data.author,
            points: data.points,
            postedAt: data.created_at_i,
            numComments: data.children ? data.children.length : 0,
            kids: data.children ? data.children.map((c: any) => c.id) : [],
            type: data.type,
            text: data.text,
            commentsDump: formattedComments // Store the formatted string
        };

        return { story, commentsText };

    } catch (e) {
        console.error(`Failed to fetch story with comments ${id}:`, e);
        return null;
    }
}
