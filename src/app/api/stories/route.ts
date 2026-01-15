import { NextRequest, NextResponse } from 'next/server';
import { translate } from 'google-translate-api-x';
import { Story, HnItem } from '@/lib/types';
import { prisma } from '@/lib/db';

const HN_BASE_URL = 'https://hacker-news.firebaseio.com/v0';

// 内存缓存：Story ID -> 中文标题
// 用于存储已翻译的标题，避免重复调用翻译 API 消耗资源
const titleCache = new Map<number, string>();

// --- Hacker News API 数据获取逻辑 ---

/**
 * 获取 Top Stories 的 ID 列表
 * 缓存 5 分钟 (300秒) 以减少对 HN 官方 API 的请求压力
 */
const fetchTopStoryIds = async (): Promise<number[]> => {
    const res = await fetch(`${HN_BASE_URL}/topstories.json`, { next: { revalidate: 300 } });
    if (!res.ok) throw new Error('Failed to fetch top stories');
    return res.json();
};

/**
 * 获取单个 Story 的详细信息
 * 缓存 1 小时 (3600秒)，因为旧内容的元数据变动不频繁
 */
const fetchItem = async (id: number): Promise<HnItem | null> => {
    const res = await fetch(`${HN_BASE_URL}/item/${id}.json`, { next: { revalidate: 3600 } });
    if (!res.ok) return null;
    return res.json();
};

/**
 * 翻译标题逻辑
 * 优先从内存缓存读取，未命中则调用 Google 翻译
 */
async function translateTitle(id: number, text: string): Promise<string> {
    // 检查缓存
    if (titleCache.has(id)) {
        return titleCache.get(id)!;
    }
    try {
        // 调用翻译服务
        const res = await translate(text, { to: 'zh-CN' });
        const translated = res.text;
        // 写入缓存
        titleCache.set(id, translated);
        return translated;
    } catch (e) {
        // 翻译失败仅记录错误，不阻断流程，返回原文
        console.error(`Translation failed for ${id}:`, e);
        return text;
    }
}

/**
 * GET 请求处理函数
 * 处理 /api/stories 请求，负责聚合数据、过滤死链、并行翻译
 */
export async function GET(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '30');

    try {
        // 1. 获取所有 Top Stories ID
        const allIds = await fetchTopStoryIds();

        // 2. 分页策略：
        // 为了过滤掉死链 (dead/deleted) 并保证每页返回足量的数据，
        // 我们预取 1.5 倍数量的 ID 作为候选集。
        const start = (page - 1) * limit;
        const end = start + Math.ceil(limit * 1.5);
        const candidateIds = allIds.slice(start, end);

        // 3. 并发获取 Item 详情
        const itemPromises = candidateIds.map(id => fetchItem(id));
        const items = await Promise.all(itemPromises);

        // 4. 过滤无效数据 (null, deleted, dead)
        const validItems = items.filter((item): item is HnItem => {
            if (!item) return false;
            if (item.deleted || item.dead) return false;
            return true;
        });

        // 5. 再次切片以确保严格符合请求的 limit 数量
        const pagedItems = validItems.slice(0, limit);

        // 6. DB Lookup for AI Summaries and Translations (Optimization)
        // Fetch existing summaries from local DB for this batch
        const summaryMap = new Map();
        try {
            const dbSummaries = await prisma.aiSummary.findMany({
                where: { storyId: { in: pagedItems.map(i => i.id) } }
            });
            dbSummaries.forEach((s: any) => summaryMap.set(s.storyId, s));
        } catch (e) {
            console.error('DB Fetch Failed:', e);
        }

        // 7. Data Transformation & Parallel Translation
        const stories: Story[] = await Promise.all(pagedItems.map(async (item) => {
            let domain = '';
            if (item.url) {
                try {
                    const u = new URL(item.url);
                    domain = u.hostname.replace('www.', '');
                } catch (e) { }
            }

            // Get AI Summary if exists
            const aiData = summaryMap.get(item.id);

            // Parallel Translation (if not in DB/Wait for separate translation service)
            // For now keeping per-request translation as fallback
            const titleZh = await translateTitle(item.id, item.title || '');

            const story: Story = {
                id: item.id,
                title: item.title || 'Untitled',
                titleZh: titleZh,
                by: item.by || 'Unknown',
                time: item.time || Date.now() / 1000,
                score: item.score || 0,
                descendants: item.descendants || 0,
                url: item.url,
                domain,
            };

            // Attach AI Data if available
            if (aiData) {
                story.summary = aiData.technical;
                story.interpretation = aiData.layman;
                story.aiComments = aiData.comments;
                try {
                    story.keywords = JSON.parse(aiData.keywords);
                    story.sentiment = JSON.parse(aiData.sentiment);
                } catch (e) {
                    // Safe fallback for parsing errors
                }
            }

            return story;
        }));

        return NextResponse.json(stories);

    } catch (error) {
        console.error('API Error:', error);
        return NextResponse.json({ error: 'Failed to fetch stories' }, { status: 500 });
    }
}
