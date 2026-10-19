import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request, platform }) => {
    try {
        // Ensure Cloudflare bindings are available
        if (!platform?.env?.KEYCODE) {
            return json({ message: 'Server configuration error' }, { status: 500 });
        }

        const { keyPhrase } = await request.json();

        if (!keyPhrase) {
            return json({ message: 'Key phrase is required' }, { status: 400 });
        }

        // 1. Fetch the user email or ID associated with this key phrase from KV
        // (Assumes you saved the key phrase as the Key and user data as the Value)
        const userDataString = await platform.env.KEYCODE.get(keyPhrase);

        // 2. Validate if the key phrase exists
        if (!userDataString) {
            return json({ message: 'Invalid key phrase' }, { status: 401 });
        }

        // 3. Parse user data if stored as JSON (e.g. { "email": "user@example.com" })
        const user = JSON.parse(userDataString);

        // Optional: Perform any additional token setups or session storage here
        
        return json({ 
            success: true, 
            email: user.email 
        });

    } catch (error) {
        console.error("KV authentication error:", error);
        return json({ message: 'Internal server error' }, { status: 500 });
    }
};
