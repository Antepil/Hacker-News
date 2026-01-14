import { MOCK_STORIES } from '@/lib/mock-data';
import { InsightCard } from './story-card';
import { useLanguage } from '@/lib/contexts/language-context';

export function StoryList() {
    const { t } = useLanguage();

    // V0.2 Requirement: Enforce Mock Data for UI demonstration
    const stories = MOCK_STORIES;

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {stories.map((story) => (
                <InsightCard key={story.id} story={story} />
            ))}
        </div>
    );
}
