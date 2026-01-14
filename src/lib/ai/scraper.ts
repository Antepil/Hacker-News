import * as cheerio from 'cheerio';

/**
 * Scrapes the content of a URL and returns the main text.
 * Limits the output to ~5000 characters to save tokens.
 */
export async function scrapeStoryContent(url: string | undefined): Promise<string> {
    if (!url) return '';

    try {
        const res = await fetch(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (compatible; HN-Insight/0.3; +http://localhost:3000)'
            },
            signal: AbortSignal.timeout(10000) // 10s timeout
        });

        if (!res.ok) {
            console.warn(`[Scraper] Failed to fetch ${url}: ${res.status}`);
            return '';
        }

        const html = await res.text();
        const $ = cheerio.load(html);

        // Remove script, style, and other non-content elements
        $('script, style, nav, header, footer, svg, img, form, iframe').remove();

        // Extract text from body
        // Strategies:
        // 1. Try to find <article> or <main>
        // 2. Fallback to <body>
        let content = $('article').text() || $('main').text() || $('body').text();

        // Clean up whitespace
        content = content.replace(/\s+/g, ' ').trim();

        // Limit length
        return content.slice(0, 5000);

    } catch (error) {
        console.warn(`[Scraper] Error fetching ${url}:`, error);
        return '';
    }
}
