export interface HnComment {
    id: number;
    author: string;
    text: string;
    postedAt: number;
    points: number | null;
    children: HnComment[];
}

export interface HnItem {
    id: number;
    deleted?: boolean;
    type?: string;
    author?: string; // Renamed from by
    postedAt?: number; // Renamed from time
    text?: string;
    dead?: boolean;
    parent?: number;
    poll?: number;
    kids?: number[];
    url?: string;
    points?: number; // Renamed from score
    title?: string;
    parts?: number[];
    numComments?: number; // Renamed from descendants
    commentsDump?: string; // Formatted text: "[Comment 1]: ..."
}

/**
 * 前端使用的 Story 类型定义
 * 包含 UI 展示所需的核心字段，以及后端注入的扩展字段 (如 titleZh, domain)。
 */
export type Story = Required<Pick<HnItem, 'id' | 'title' | 'postedAt' | 'author' | 'points'>> & {
    url?: string;
    numComments?: number; // 评论数
    domain?: string;      // 来源域名 (如 nytimes.com)
    titleZh?: string;     // 中文标题 (由服务端翻译并注入)
    type?: string;
    // V0.3 AI Fields
    category?: string;
    sentiment?: {
        constructive: number;
        technical: number;
        controversial: number;
    };
    summary?: string;        // Markdown: Technical Summary
    summaryZh?: string;
    interpretation?: string; // Markdown: Layman Interpretation
    interpretationZh?: string;
    aiComments?: string;     // Markdown: Comments Summary
    aiCommentsZh?: string;
    keywords?: string[];
};
