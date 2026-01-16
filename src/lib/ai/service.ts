import OpenAI from 'openai';
import { HnItem } from '@/lib/types';

export interface GeneratedSummary {
    technical: string;
    technicalZh: string; // New
    layman: string;
    laymanZh: string; // New
    comments: string;
    commentsZh: string; // New
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
 * @param commentsDump Formatted comments string ("[Comment 1]: ...")
 * @param articleContent The actual scraped text of the article
 * @param config Optional configuration (BYOK)
 */
export async function generateStorySummary(
    story: HnItem,
    commentsDump: string,
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
  Top Comments:
  ${commentsDump ? commentsDump : "(No comments provided. Skip comment analysis.)"}

  Output a valid JSON object. Ensure all strings are properly escaped (e.g., " should be \").
  Do NOT use Markdown code blocks. Just output the raw JSON string.
  Structure:
  {
    "technical": "3 bullet points summary using Markdown (bullet points start with -). Focus on the core technical details from the Article Content.",
    "technicalZh": "Translate the technical summary into Professional Chinese (Markdown bullet points).",
    "layman": "One short paragraph explaining the significance in plain English.",
    "laymanZh": "Translate the layman summary into Chinese.",
    "comments": "Provide exactly 3 distinct interpretations/takeaways from the comments. Format as a Markdown list with 3 bullet points. Each point should capture a unique perspective or valid criticism found in the discussion. IF NO COMMENTS ARE PROVIDED, return an empty string.",
    "commentsZh": "Translate the comments interpretations into Chinese (Markdown bullet points). IF NO COMMENTS, return empty string.",
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

    try {
        const parsed = JSON.parse(content);
        return {
            technical: parsed.technical || 'No technical summary available.',
            technicalZh: parsed.technicalZh || '暂无技术摘要。',
            layman: parsed.layman || 'No interpretation available.',
            laymanZh: parsed.laymanZh || '暂无通俗解读。',
            comments: parsed.comments || '',
            commentsZh: parsed.commentsZh || '',
            keywords: Array.isArray(parsed.keywords) ? parsed.keywords : [],
            sentiment: parsed.sentiment || { constructive: 50, technical: 50, controversial: 0 }
        };
    } catch (e) {
        console.error('OpenAI JSON Parse Error:', e);
        return null;
    }
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
        max_tokens: 16000 // Increased requested by usage
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

    // Strip Markdown code blocks more robustly
    const jsonString = content.replace(/```json/g, '').replace(/```/g, '').trim();

    try {
        const parsed = JSON.parse(jsonString);
        return {
            technical: parsed.technical || 'No technical summary available.',
            technicalZh: parsed.technicalZh || '暂无技术摘要。',
            layman: parsed.layman || 'No interpretation available.',
            laymanZh: parsed.laymanZh || '暂无通俗解读。',
            comments: parsed.comments || '',
            commentsZh: parsed.commentsZh || '',
            keywords: Array.isArray(parsed.keywords) ? parsed.keywords : [],
            sentiment: parsed.sentiment || { constructive: 50, technical: 50, controversial: 0 }
        };
    } catch (e) {
        console.error(`[MiniMax] JSON Parse Error. Raw Content:`, content);
        throw e;
    }
}
