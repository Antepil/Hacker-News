
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
    try {
        const { provider, apiKey, baseUrl, model } = await req.json();

        if (!apiKey) {
            return NextResponse.json({ error: 'API Key is required' }, { status: 400 });
        }

        // Validate that apiKey contains only ASCII characters to prevent header errors
        // (User likely entered Chinese or emoji which causes "ByteString" error)
        if (!/^[\x00-\x7F]*$/.test(apiKey)) {
            return NextResponse.json({
                error: 'Invalid API Key: Contains non-ASCII characters. Please enter a valid key (e.g., sk-...)'
            }, { status: 400 });
        }

        let endpoint = baseUrl;
        let body: any = {};

        // Defaults if baseUrl is missing
        if (!endpoint) {
            if (provider === 'minimax') {
                endpoint = 'https://api.minimax.io/v1/text/chatcompletion_v2';
            } else {
                endpoint = 'https://api.openai.com/v1/chat/completions';
            }
        }

        // Construct Request Body
        if (provider === 'minimax') {
            body = {
                model: model || 'MiniMax-M2.1',
                messages: [
                    { role: 'system', name: 'MiniMax AI', content: 'Ping' },
                    { role: 'user', name: 'user', content: 'Hi' }
                ],
                stream: false,
                max_tokens: 5
            };
        } else {
            // OpenAI Compatible
            // Ensure endpoint ends with /chat/completions if using standard structure
            if (!endpoint.includes('/chat/completions') && !endpoint.includes('/generate')) {
                // Don't auto-append if user provided a full random URL, but for standard OpenAI/Azure it helps
                // Actually, let's just respect the baseUrl if provided, or default to standard.
                // If user provided "https://api.openai.com/v1", we append.
                if (!endpoint.endsWith('/v1') && !endpoint.endsWith('/')) {
                    // hard to guess. Let's assume user provides base. 
                }
                // Revert to safer logic: if default was used, we know. If custom, we rely on user?
                // Or: Client Logic was: `!endpoint.includes('/chat/completions') => append`.
                // Let's replicate strict OpenAI logic.
                if (endpoint === 'https://api.openai.com/v1') {
                    endpoint = 'https://api.openai.com/v1/chat/completions';
                }
            }
            // Just case:
            if (!endpoint.includes('/chat/completions') && endpoint.includes('api.openai.com')) {
                endpoint = endpoint.replace(/\/$/, '') + '/chat/completions';
            }

            body = {
                model: model || 'gpt-4o',
                messages: [{ role: 'user', content: 'Hi' }],
                max_tokens: 5
            };
        }

        const res = await fetch(endpoint, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(body)
        });

        if (!res.ok) {
            const errorText = await res.text();
            return NextResponse.json({ error: `Provider Error ${res.status}: ${errorText}` }, { status: res.status });
        }

        const data = await res.json();
        return NextResponse.json({ success: true, data });

    } catch (error: any) {
        console.error('Ping Proxy Error:', error);
        return NextResponse.json({ error: error.message || 'Server Error' }, { status: 500 });
    }
}
