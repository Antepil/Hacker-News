'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';

type Language = 'en' | 'zh';

interface LanguageContextType {
    language: Language;
    setLanguage: (lang: Language) => void;
    t: (text: string) => string; // 简单的翻译函数，用于静态 UI 文本
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

/**
 * 语言上下文提供者
 * 管理全局语言状态 ('en' 或 'zh')，并提供基础的 t() 函数用于静态文本的国际化。
 */
export function LanguageProvider({ children }: { children: React.ReactNode }) {
    const [language, setLanguage] = useState<Language>('en');

    // 静态文本映射表
    // 对于动态内容 (如新闻标题)，我们通过后端 API 返回的 titleZh 字段处理。
    // 这里仅处理 UI 自身固定的文本 (如按钮、标签)。
    const t = (text: string) => {
        if (language === 'en') return text;
        const map: Record<string, string> = {
            'Previous': '上一页',
            'Next': '下一页',
            'Page': '页',
            'Updating...': '更新中...',
            'Retry': '重试',
            'Failed to load stories': '加载失败',
            'Please check your connection and try again.': '请检查网络并重试。',
            'Show/Ask HN': '内部分享/提问',
            'comments': '评论',
            'ago': '前',
            'just now': '刚刚',
            'year': '年',
            'years': '年',
            'month': '个月',
            'months': '个月',
            'day': '天',
            'days': '天',
            'hour': '小时',
            'hours': '小时',
            'minute': '分钟',
            'minutes': '分钟',
            'second': '秒',
            'seconds': '秒',
            'A better way to read Hacker News.': '一种更佳的 Hacker News 阅读方式。',
            'Built with Next.js, Tailwind, and Shadcn UI.': '基于 Next.js, Tailwind 和 Shadcn UI 构建。',
            'Data provided by Hacker News API.': '数据来源于 Hacker News API。',
            'HN-Insight': 'HN-洞察',
            // V0.2 UI Strings
            'Summary': '技术摘要',
            'Interpretation': '通俗解读',
            'Comments': '评论',
            'General': '综合',
            'AI Summary not available yet.': 'AI 摘要尚未生成。',
            'Interpretation pending.': '通俗解读生成中。',
            'AI Comment analysis pending.': '评论分析生成中。'
        };
        return map[text] || text;
    };

    return (
        <LanguageContext.Provider value={{ language, setLanguage, t }}>
            {children}
        </LanguageContext.Provider>
    );
}

/**
 * 自定义 Hook 用于消费语言上下文
 */
export function useLanguage() {
    const context = useContext(LanguageContext);
    if (context === undefined) {
        throw new Error('useLanguage must be used within a LanguageProvider');
    }
    return context;
}
