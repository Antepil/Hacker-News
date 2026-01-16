'use client';

import useSWR from 'swr';
import { InsightCard } from './story-card';
import { Story } from '@/lib/types';
import { useLanguage } from '@/lib/contexts/language-context';

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export function StoryList() {
    const { t } = useLanguage();
    const { data, error, isLoading } = useSWR<Story[] | { error: string }>('/api/stories', fetcher);

    // Safety check: Ensure data is an array before using it
    const stories = Array.isArray(data) ? data : null;
    const serverError = !Array.isArray(data) && data ? data : null;

    if (error || serverError) return <div className="text-center py-10 text-red-500">{t('Failed to load stories.')}</div>;
    if (isLoading) return <div className="text-center py-10">{t('Loading stories...')}</div>;

    if (!stories || stories.length === 0) {
        return <div className="text-center py-10 text-muted-foreground">{t('No stories found.')}</div>;
    }

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {stories.map((story) => (
                <InsightCard key={story.id} story={story} />
            ))}
        </div>
    );
}
