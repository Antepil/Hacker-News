import OpenAI from 'openai';
import { HnItem } from '@/lib/types';

export interface GeneratedSummary {
    technical: string;
    layman: string;
    comments: string;
    keywords: string[];
    sentiment: {
        constructive: number;
        technical: number;
        controversial: number;
    };
}

export interface AiConfig {
    provider?: 'openai' | 'minimax';
    apiKey?: string;
    baseUrl?: string;
    model?: string;
}

/**
 * Generate AI Summary for a Story
 * @param story The HN Story object
 * @param commentsText Top comment texts
 * @param articleContent The actual scraped text of the article
 * @param config Optional configuration (BYOK)
 */
export async function generateStorySummary(
    story: HnItem,
    commentsText: string[],
    articleContent: string,
    config: AiConfig = {}
): Promise<GeneratedSummary | null> {

    const provider = config.provider || process.env.AI_PROVIDER || 'openai';
    const apiKey = config.apiKey || (provider === 'minimax' ? process.env.MINIMAX_API_KEY : process.env.OPENAI_API_KEY);
    const baseURL = config.baseUrl || (provider === 'minimax' ? 'https://api.minimax.io/v1/text/chatcompletion_v2' : process.env.OPENAI_BASE_URL);
    const model = config.model || (provider === 'minimax' ? 'MiniMax-M2.1' : 'gpt-4o');

    if (!apiKey) {
        console.warn(`No API Key available for AI generation (${provider}).`);
        return null;
    }

    const prompt = `
  You are an expert tech news analyst for "HN-Insight".
  Analyze the following Hacker News story, its main content, and its top comments.
  
  Story Meta:
  - Title: ${story.title}
  - URL: ${story.url || 'No URL'}
  
  Article Content (Truncated):
  """
  ${articleContent ? articleContent : '(Content failed to load, rely on title and comments)'}
  """

  Top Comments:
  ${commentsText.map(c => `- ${c.slice(0, 300)}`).join('\n')}

  Output a valid JSON object with the following structure (do NOT use Markdown code blocks, just raw JSON):
  {
    "technical": "3 bullet points summary using Markdown (bullet points start with -). Focus on the core technical details from the Article Content.",
    "layman": "One short paragraph explaining the significance in plain English.",
    "comments": "Summary of user discussion/controversy using Markdown. Focus on the Top Comments.",
    "keywords": ["tag1", "tag2", "tag3"],
    "sentiment": {
       "constructive": 0-100,
       "technical": 0-100,
       "controversial": 0-100
    }
  }
  `;

    try {
        if (provider === 'minimax') {
            return await generateMiniMax(apiKey, baseURL!, model, prompt);
        } else {
            return await generateOpenAI(apiKey, baseURL, model, prompt);
        }

    } catch (error) {
        console.error(`AI Generation Failed (${provider}):`, error);
        return null;
    }
}

async function generateOpenAI(apiKey: string, baseURL: string | undefined, model: string, prompt: string): Promise<GeneratedSummary | null> {
    const client = new OpenAI({
        apiKey: apiKey,
        baseURL: baseURL
    });

    const response = await client.chat.completions.create({
        model: model,
        messages: [{ role: 'user', content: prompt }],
        response_format: { type: 'json_object' }
    });

    const content = response.choices[0]?.message?.content;
    if (!content) return null;

    return JSON.parse(content) as GeneratedSummary;
}

async function generateMiniMax(apiKey: string, endpoint: string, model: string, prompt: string): Promise<GeneratedSummary | null> {
    // MiniMax uses a specific POST endpoint structure
    const body = {
        model: model,
        messages: [
            {
                role: 'system',
                name: 'MiniMax AI', // Required by MiniMax example
                content: "You are a helpful assistant that outputs JSON."
            },
            {
                role: 'user',
                name: 'user', // Required by MiniMax example
                content: prompt
            }
        ],
        stream: false,
        max_tokens: 1000 // Safe limit
    };

    const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`MiniMax API Error ${response.status}: ${errorText}`);
    }

    const data = await response.json();

    // MiniMax response structure usually mimics OpenAI but let's be safe
    // Assuming choices[0].message.content or similar
    const content = data.choices?.[0]?.message?.content || data.reply || data.base_resp?.status_msg;

    // If the content is wrapped in markdown code blocks ```json ... ```, strip them
    const jsonString = content.replace(/^```json\s*|\s*```$/g, '');

    return JSON.parse(jsonString) as GeneratedSummary;
}
