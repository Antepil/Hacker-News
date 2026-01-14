import { ExternalLink, MessageCircle, Clock, TrendingUp, User, Globe } from 'lucide-react';
import { Story } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useLanguage } from '@/lib/contexts/language-context';

interface InsightCardProps {
    story: Story;
}

/**
 * InsightCard (V0.2)
 * High density dashboard card with sentiment analysis and AI summaries.
 */
export function InsightCard({ story }: InsightCardProps) {
    const { language, t } = useLanguage();

    // Title Logic
    const displayTitle = (language === 'zh' && story.titleZh) ? story.titleZh : story.title;

    // Time Ago Logic
    const timeAgo = (timestamp: number) => {
        const seconds = Math.floor((Date.now() / 1000) - timestamp);
        const intervals = [
            { label: 'year', seconds: 31536000 },
            { label: 'month', seconds: 2592000 },
            { label: 'day', seconds: 86400 },
            { label: 'hour', seconds: 3600 },
            { label: 'minute', seconds: 60 },
            { label: 'second', seconds: 1 }
        ];
        for (const interval of intervals) {
            const count = Math.floor(seconds / interval.seconds);
            if (count >= 1) {
                return `${count} ${t(interval.label + (count !== 1 ? 's' : ''))} ${t('ago')}`;
            }
        }
        return t('just now');
    };

    const targetUrl = story.url || `https://news.ycombinator.com/item?id=${story.id}`;
    const commentUrl = `https://news.ycombinator.com/item?id=${story.id}`;

    // Sentiment Data (Default to balanced/neutral if missing, as real API doesn't provide this)
    const sentiment = story.sentiment || { constructive: 33, technical: 34, controversial: 33 };

    return (
        <Card className="h-[380px] flex flex-col hover:shadow-lg transition-all duration-300 border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 group">
            <CardHeader className="pb-1 px-5 pt-4 shrink-0">
                {/* Title & Link */}
                <div className="flex justify-between items-start gap-2 h-[52px]">
                    <CardTitle className="text-[17px] font-bold leading-snug text-neutral-900 dark:text-neutral-100 line-clamp-2">
                        <a href={targetUrl} target="_blank" rel="noopener noreferrer" className="hover:text-primary transition-colors">
                            {displayTitle}
                        </a>
                    </CardTitle>
                    <a href={targetUrl} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-primary shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                        <ExternalLink className="w-4 h-4" />
                    </a>
                </div>

                {/* Metadata Row */}
                <div className="flex flex-wrap items-center gap-3 text-[11px] text-muted-foreground mt-1 font-medium">
                    <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {timeAgo(story.time)}
                    </span>
                    <span className="flex items-center gap-1 text-orange-600 dark:text-orange-400">
                        <TrendingUp className="w-3 h-3" />
                        {story.score}
                    </span>
                    <a href={commentUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                        <MessageCircle className="w-3 h-3" />
                        {story.descendants}
                    </a>
                    {story.domain && (
                        <span className="flex items-center gap-1 ml-auto truncate max-w-[120px]">
                            <Globe className="w-3.5 h-3.5" />
                            {story.domain}
                        </span>
                    )}
                </div>
            </CardHeader>

            {/* Sentiment Bar - Show Neutral if missing */}
            <div className="w-full h-1 flex my-1 px-5 opacity-80 shrink-0">
                <div className="h-full bg-emerald-500 first:rounded-l-full" style={{ width: `${sentiment.constructive}%` }} />
                <div className="h-full bg-blue-500" style={{ width: `${sentiment.technical}%` }} />
                <div className="h-full bg-red-500 last:rounded-r-full" style={{ width: `${sentiment.controversial}%` }} />
            </div>

            <CardContent className="flex-1 overflow-hidden flex flex-col min-h-0">
                <Tabs defaultValue="summary" className="w-full h-full flex flex-col">
                    <TabsList className="grid w-full grid-cols-3 mb-2 bg-slate-100 dark:bg-slate-800 h-7 p-0.5 shrink-0">
                        <TabsTrigger value="summary" className="text-[11px] h-full">{t('Summary') || 'Summary'}</TabsTrigger>
                        <TabsTrigger value="interpretation" className="text-[11px] h-full">{t('Interpretation') || 'Interpretation'}</TabsTrigger>
                        <TabsTrigger value="comments" className="text-[11px] h-full">{t('Comments') || 'Comments'}</TabsTrigger>
                    </TabsList>

                    <div className="flex-1 overflow-y-auto pr-1 min-h-0">
                        <TabsContent value="summary" className="mt-0 h-full">
                            {story.summary ? (
                                <ul className="space-y-1.5 pb-1">
                                    {story.summary.map((item, i) => (
                                        <li key={i} className="text-xs text-slate-600 dark:text-slate-400 flex items-start gap-2 leading-relaxed">
                                            <span className="block w-1 h-1 mt-1.5 rounded-full bg-emerald-400 shrink-0" />
                                            <span>{item}</span>
                                        </li>
                                    ))}
                                </ul>
                            ) : (
                                <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground gap-2">
                                    <p className="text-[10px] italic">{t('AI Summary not available yet.')}</p>
                                </div>
                            )}
                        </TabsContent>

                        <TabsContent value="interpretation" className="mt-0 h-full">
                            {story.interpretation ? (
                                <ul className="space-y-1.5 pb-1">
                                    {story.interpretation.map((item, i) => (
                                        <li key={i} className="text-xs text-slate-600 dark:text-slate-400 flex items-start gap-2 leading-relaxed">
                                            <span className="block w-1 h-1 mt-1.5 rounded-full bg-blue-400 shrink-0" />
                                            <span>{item}</span>
                                        </li>
                                    ))}
                                </ul>
                            ) : (
                                <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground gap-2">
                                    <p className="text-[10px] italic">{t('Interpretation pending.')}</p>
                                </div>
                            )}
                        </TabsContent>

                        <TabsContent value="comments" className="mt-0 h-full">
                            {story.aiComments ? (
                                <ul className="space-y-1.5 pb-1">
                                    {story.aiComments.map((item, i) => (
                                        <li key={i} className="text-xs text-slate-600 dark:text-slate-400 flex items-start gap-2 leading-relaxed">
                                            <span className="block w-1 h-1 mt-1.5 rounded-full bg-red-400 shrink-0" />
                                            <span>{item}</span>
                                        </li>
                                    ))}
                                </ul>
                            ) : (
                                <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground gap-2">
                                    <p className="text-[10px] italic">{t('AI Comment analysis pending.')}</p>
                                </div>
                            )}
                        </TabsContent>
                    </div>
                </Tabs>
            </CardContent>

            <CardFooter className="pt-0 pb-3 shrink-0 flex items-center justify-between mt-0 px-5">
                {/* Category Badge - Show 'General' if missing */}
                <Badge variant="secondary" className="bg-slate-50 text-slate-500 border border-slate-100 hover:bg-slate-100 dark:bg-slate-800/50 dark:text-slate-400 dark:border-slate-800 px-2 py-0 rounded-full font-normal text-[10px] h-5">
                    {story.category || t('General') || 'General'}
                </Badge>

                {/* Keywords - Truncated */}
                {story.keywords && story.keywords.length > 0 && (
                    <div className="flex gap-1 overflow-hidden justify-end">
                        {story.keywords.slice(0, 2).map((kw, i) => (
                            <Badge key={i} variant="outline" className="text-[10px] text-slate-400 dark:text-slate-500 font-normal border-slate-100 dark:border-slate-800 px-1.5 py-0 whitespace-nowrap h-5">
                                {kw}
                            </Badge>
                        ))}
                    </div>
                )}
            </CardFooter>
        </Card>
    );
}
