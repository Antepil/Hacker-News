import { HnItem } from '@/lib/types';

const HN_BASE_URL = 'https://hacker-news.firebaseio.com/v0';

/**
 * 获取 Top Stories 的 ID 列表
 * 缓存 5 分钟 (300秒) 以减少对 HN 官方 API 的请求压力
 */
export const fetchTopStoryIds = async (): Promise<number[]> => {
    const res = await fetch(`${HN_BASE_URL}/topstories.json`, { next: { revalidate: 300 } });
    if (!res.ok) throw new Error('Failed to fetch top stories');
    return res.json();
};

/**
 * 获取单个 Story 的详细信息
 * 缓存 1 小时 (3600秒)，因为旧内容的元数据变动不频繁
 */
export const fetchItem = async (id: number): Promise<HnItem | null> => {
    const res = await fetch(`${HN_BASE_URL}/item/${id}.json`, { next: { revalidate: 3600 } });
    if (!res.ok) return null;
    return res.json();
};
