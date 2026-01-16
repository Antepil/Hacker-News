
import { generateStorySummary } from '@/lib/ai/service'; // Assuming relative import works with tsx magic, if not, adjust
import { HnItem } from '@/lib/types';

// Mock Config to avoid real API call if keys are missing, 
// OR use real API if available to verifying the prompt effectiveness.
// For safety, let's use the real API if env var exists, otherwise mock.
// Actually, to test the PROMPT format, we need to send it to the LLM. 
// So this script requires OPENAI_API_KEY or similar.

async function main() {
    console.log('Testing AI Generation...');

    const mockStory: HnItem = {
        id: 123456,
        title: "Test Story for AI Comments",
        url: "https://example.com/test",
        author: "tester",
        postedAt: 1234567890,
        points: 100,
        numComments: 10,
        kids: [],
        commentsDump: `[Comment 1]: This tool is great but too expensive for hobbyists.
[Comment 2]: I disagree, the time saved is worth the money.
[Comment 3]: Security is a major concern here, I saw X vulnerability.`
    };

    const mockArticleContent = "This is a dummy article content about a new tool.";

    // Check for API Keys
    if (!process.env.OPENAI_API_KEY && !process.env.MINIMAX_API_KEY) {
        console.warn('Skipping actual AI call because no API keys found in env.');
        console.log('Mocking success response to verify logic flow only.');
        return;
    }

    try {
        const result = await generateStorySummary(mockStory, mockStory.commentsDump!, mockArticleContent);

        console.log('--- AI Generation Result ---');
        console.log(JSON.stringify(result, null, 2));

        if (result && result.comments) {
            console.log('--- Comments Field Check ---');
            console.log(result.comments);
        }

    } catch (e) {
        console.error('Error during generation:', e);
    }
}

main();
