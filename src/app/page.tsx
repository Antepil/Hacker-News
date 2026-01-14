'use client';

import { StoryList } from "@/components/story-list";
import { FloatingControls } from "@/components/floating-controls";
import { useLanguage } from "@/lib/contexts/language-context";

/**
 * 主页面组件 (Client Component)
 * 包含头部 Header、文章列表 Main 和页脚 Footer。
 * 使用 useLanguage() Hook 实现文本的国际化切换。
 */
export default function Home() {
  const { t } = useLanguage();
  return (
    <div className="container max-w-[1280px] mx-auto py-8 px-4">
      {/* 头部区域 */}
      <header className="mb-8 border-b pb-4">
        <h1 className="text-3xl font-bold tracking-tight mb-2">{t('HN-Insight')}</h1>
        <p className="text-muted-foreground">
          {t('A better way to read Hacker News.')}
        </p>
      </header>

      {/* 主要内容区域：文章列表 */}
      <main>
        <StoryList />
      </main>

      {/* 全局悬浮控制组件 (语言 + 主题) */}
      <FloatingControls />

      {/* 页脚区域 */}
      <footer className="mt-12 text-center text-sm text-muted-foreground py-8 border-t">
        <p>{t('Built with Next.js, Tailwind, and Shadcn UI.')}</p>
        <p>{t('Data provided by Hacker News API.')}</p>
      </footer>
    </div>
  );
}
