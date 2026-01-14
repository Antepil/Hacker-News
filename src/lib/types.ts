export interface HnItem {
    id: number;
    deleted?: boolean;
    type?: 'job' | 'story' | 'comment' | 'poll' | 'pollopt';
    by?: string;
    time?: number;
    text?: string;
    dead?: boolean;
    parent?: number;
    poll?: number;
    kids?: number[];
    url?: string;
    score?: number;
    title?: string;
    parts?: number[];
    descendants?: number;
}

/**
 * 前端使用的 Story 类型定义
 * 包含 UI 展示所需的核心字段，以及后端注入的扩展字段 (如 titleZh, domain)。
 */
export type Story = Required<Pick<HnItem, 'id' | 'title' | 'time' | 'by' | 'score'>> & {
    url?: string;
    descendants?: number; // 评论数
    domain?: string;      // 来源域名 (如 nytimes.com)
    titleZh?: string;     // 中文标题 (由服务端翻译并注入)
    // V0.2 New Fields (Optional for now, populated by Mock Data/AI)
    category?: string;
    sentiment?: {
        constructive: number;
        technical: number;
        controversial: number;
    };
    summary?: string[];
    interpretation?: string[];
    aiComments?: string[];
    keywords?: string[];
};
