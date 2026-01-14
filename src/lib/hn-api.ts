import { Story } from './types';

/**
 * 获取故事列表
 * 调用我们自己的后端 API代理 (/api/stories)，该接口已处理了过滤、分页和翻译。
 * 
 * @param page 当前页码
 * @param limit 每页数量，默认 30
 * @returns Story 数组
 */
export const getStories = async (page: number, limit: number = 30): Promise<Story[]> => {
    const res = await fetch(`/api/stories?page=${page}&limit=${limit}`);
    if (!res.ok) {
        throw new Error('Failed to fetch stories');
    }
    return res.json();
};
