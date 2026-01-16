import { NextRequest, NextResponse } from 'next/server';
import { translate } from 'google-translate-api-x';
import { Story, HnItem } from '@/lib/types';
import { prisma } from '@/lib/db';

const HN_BASE_URL = 'https://hacker-news.firebaseio.com/v0';

// 内存缓存：Story ID -> 中文标题
// 用于存储已翻译的标题，避免重复调用翻译 API 消耗资源
const titleCache = new Map<number, string>();

// --- Hacker News API 数据获取逻辑 ---
// moved to @/lib/hn-service.ts

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
        // 1. Fetch Stories directly from DB
        // User requested "latest 30 posts" from DB.
        const storiesFromDb = await prisma.story.findMany({
            orderBy: { postedAt: 'desc' },
            skip: (page - 1) * limit,
            take: limit,
            include: {
                aiSummary: true
            }
        });

        // 2. Data Transformation & Translation
        const stories: Story[] = await Promise.all(storiesFromDb.map(async (dbStory: any) => {
            // Translation Fallback: If DB doesn't have titleZh, try on-the-fly translation
            let titleZh = dbStory.titleZh || '';
            if (!titleZh && dbStory.title) {
                titleZh = await translateTitle(dbStory.id, dbStory.title);
            }

            const story: Story = {
                id: dbStory.id,
                title: dbStory.title,
                titleZh: titleZh, // Use DB value or translated value
                author: dbStory.author || 'Unknown',
                postedAt: dbStory.postedAt,
                points: dbStory.points,
                numComments: dbStory.numComments,
                url: dbStory.url || undefined,
                domain: dbStory.domain || undefined, // Use DB domain if available
            };

            // Calculate domain if missing in DB but URL exists (just in case)
            if (!story.domain && story.url) {
                try {
                    const u = new URL(story.url);
                    story.domain = u.hostname.replace('www.', '');
                } catch (e) { }
            }

            // Map AI Summary fields
            if (dbStory.aiSummary) {
                story.summary = dbStory.aiSummary.technical;
                story.interpretation = dbStory.aiSummary.layman;
                story.aiComments = dbStory.aiSummary.comments; // Mapping AiSummary.comments to Frontend aiComments
                // Map Chinese fields
                story.summaryZh = dbStory.aiSummary.technicalZh;
                story.interpretationZh = dbStory.aiSummary.laymanZh;
                story.aiCommentsZh = dbStory.aiSummary.commentsZh;
                try {
                    story.keywords = JSON.parse(dbStory.aiSummary.keywords);
                    story.sentiment = JSON.parse(dbStory.aiSummary.sentiment);
                } catch (e) {
                    // Safe fallback
                }
            }

            return story;
        }));

        return NextResponse.json(stories);

    } catch (error: any) {
        console.error('API Error:', error);
        return NextResponse.json({
            error: 'Failed to fetch stories',
            details: error?.message || String(error),
            stack: error?.stack
        }, { status: 500 });
    }
}
