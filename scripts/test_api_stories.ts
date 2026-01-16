
async function verifyApi() {
    const res = await fetch('http://localhost:3000/api/stories?limit=5');
    if (!res.ok) {
        console.error('API Error:', res.status, res.statusText);
        try {
            const err = await res.json();
            console.error('Details:', err.details || err);
        } catch (e) {
            const txt = await res.text();
            console.error('Body:', txt);
        }
        return;
    }
    const stories = await res.json();
    console.log(`Fetched ${stories.length} stories from API (DB Source).`);

    if (stories.length > 0) {
        const s = stories[0];
        console.log('--- Sample Story ---');
        console.log('Title:', s.title);
        console.log('AI Comments Present:', !!s.aiComments);
        if (s.aiComments) {
            console.log('AI Comments Preview:', s.aiComments.substring(0, 100));
        }
    } else {
        console.log('No stories returned. Is the DB empty?');
    }
}

verifyApi();
