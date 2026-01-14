import useSWR from 'swr';
import { getStories } from '@/lib/hn-api';
import { InsightCard } from './story-card';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/lib/contexts/language-context';
import { toast } from 'sonner';
import { useState } from 'react';

const fetcher = ([page, limit]: [number, number]) => getStories(page, limit);

export function StoryList() {
    const [page, setPage] = useState(1);
    const { t } = useLanguage();

    // Switch back to Real HN API
    const { data, error, isLoading, isValidating } = useSWR([page, 30], fetcher, {
        keepPreviousData: true,
        revalidateOnFocus: false,
        onError: () => {
            toast("Failed to load stories", {
                description: "Please check your connection and try again.",
                action: {
                    label: t("Retry"),
                    onClick: () => window.location.reload()
                }
            });
        }
    });

    return (
        <div className="space-y-8">
            {isLoading && !data ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {Array.from({ length: 9 }).map((_, i) => (
                        <div key={i} className="border rounded-xl p-4 h-[380px] flex flex-col gap-4">
                            <Skeleton className="h-6 w-3/4" />
                            <Skeleton className="h-4 w-1/2" />
                            <div className="flex-1" />
                            <Skeleton className="h-32 w-full" />
                        </div>
                    ))}
                </div>
            ) : (
                <>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {data?.map((story) => (
                            <InsightCard key={story.id} story={story} />
                        ))}
                    </div>

                    <div className="flex justify-center py-8 gap-4">
                        <Button
                            variant="outline"
                            onClick={() => setPage(p => Math.max(1, p - 1))}
                            disabled={page === 1 || isValidating}
                        >
                            {t('Previous')}
                        </Button>
                        <span className="flex items-center font-mono">{t('Page')} {page}</span>
                        <Button
                            variant="outline"
                            onClick={() => setPage(p => p + 1)}
                            disabled={isValidating}
                        >
                            {t('Next')}
                        </Button>
                    </div>
                </>
            )}
        </div>
    );
}
