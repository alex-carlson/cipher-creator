import { redirect } from '@sveltejs/kit';

export async function handle({ event, resolve }) {
    // 1. Check if the user is trying to access the admin section
    if (event.url.pathname.startsWith('/admin')) {
		
        // Skip check if they are already on the login page itself to prevent infinite loops
        if (event.url.pathname !== '/admin/login') {
            const session = event.cookies.get('admin_session');
            const expectedSession = event.platform?.env?.ADMIN_SESSION_SECRET || 'fallback-secret';

            // 2. If cookie doesn't match your secret, redirect to your admin login page
            if (session !== expectedSession) {
                throw redirect(303, '/admin/login');
            }
        }
    }

    // Continue processing normal requests
    return await resolve(event);
}
