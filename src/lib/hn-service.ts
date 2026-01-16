import { HnItem } from '@/lib/types';

const ALGOLIA_BASE_URL = 'http://hn.algolia.com/api/v1';

/**
 * 获取 Top Stories 的 ID 列表
 * 使用 Algolia 的 search API 获取 front_page 的 items
 * 缓存 5 分钟 (300秒)
 */
export const fetchTopStoryIds = async (): Promise<number[]> => {
    // hitsPerPage=30 explicitly to get enough candidates
    const res = await fetch(`${ALGOLIA_BASE_URL}/search?tags=front_page&hitsPerPage=30`, { next: { revalidate: 300 } });
    if (!res.ok) throw new Error('Failed to fetch top stories from Algolia');

    const data = await res.json();
    if (!data.hits) return [];

    // Algolia returns objectID as string, cast to number
    return data.hits.map((hit: any) => Number(hit.objectID));
};

/**
 * 获取单个 Story 的详细信息
 * 使用 Algolia 的 items API
 * 缓存 1 小时 (3600秒)
 */
export const fetchItem = async (id: number): Promise<HnItem | null> => {
    const res = await fetch(`${ALGOLIA_BASE_URL}/items/${id}`, { next: { revalidate: 3600 } });
    if (!res.ok) return null;

    const data = await res.json();

    // Map Algolia response format to HnItem interface (Firebase format compatibility)
    // Algolia fields: objectID, title, url, author, points, created_at_i, children
    return {
        id: data.id, // items/:id returns 'id' as number
        title: data.title,
        url: data.url,
        author: data.author, // Renamed
        points: data.points, // Renamed
        postedAt: data.created_at_i, // Renamed
        numComments: data.children ? data.children.length : 0, // Renamed
        // Algolia 'children' is the tree. Firebase 'kids' is just IDs.
        // HnItem 'kids' expects number array.
        kids: data.children ? data.children.map((child: any) => child.id) : [],
        type: data.type || 'story',
        text: data.text
    };
};
