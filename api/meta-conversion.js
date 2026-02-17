export default async function handler(req, res) {
    // CORS configuration
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader(
        'Access-Control-Allow-Headers',
        'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
    );

    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const PIXEL_ID = '1418616516483655'; // New Pixel ID
        const ACCESS_TOKEN = 'EAAMMWyh291EBQnRTR2EOQzBdm4DJt8dhKCv1ffWPrHCZAfT0qLExFKvgZA5kZCYvMCDyHtRwZCZAZCSnCMD0ZC2KE6KktrKBuWEfMCVITwot5iBVrq6jHDotthY1jZCiWDDEcnY0mR5zTm50BUxquRJXiH0wySqqDEIS7gzqjHXHybpvArqVNfZColSByk8HqKwZDZD';

        const { event_name, event_source_url, fbp, fbc } = req.body;

        // Get client IP and User Agent
        const client_ip_address = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
        const client_user_agent = req.headers['user-agent'];

        const eventData = {
            data: [
                {
                    event_name: event_name || 'Purchase',
                    event_time: Math.floor(Date.now() / 1000),
                    action_source: 'website',
                    event_source_url: event_source_url,
                    user_data: {
                        client_ip_address: client_ip_address,
                        client_user_agent: client_user_agent,
                        fbp: fbp,
                        fbc: fbc,
                    },
                    custom_data: {
                        currency: 'MXN',
                        value: 69.00,
                    },
                },
            ],
            access_token: ACCESS_TOKEN,
        };

        console.log('Sending event to Meta:', JSON.stringify(eventData, null, 2));

        const response = await fetch(
            `https://graph.facebook.com/v19.0/${PIXEL_ID}/events`,
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(eventData),
            }
        );

        const data = await response.json();

        if (!response.ok) {
            console.error('Meta API Error:', data);
            return res.status(response.status).json(data);
        }

        // --- PUSHCUT INTEGRATION ---
        if (event_name === 'Purchase') {
            try {
                let pushcutUrl = 'https://api.pushcut.io/K8sS0qz0OXt-OmLwXQwTV/notifications/MinhaNotifica%C3%A7%C3%A3o1'; // Default (CLABE)

                // Se for OXXO, usa a notificação específica (sem o "1" no final)
                if (req.body.payment_method && req.body.payment_method.includes('OXXO')) {
                    pushcutUrl = 'https://api.pushcut.io/K8sS0qz0OXt-OmLwXQwTV/notifications/MinhaNotifica%C3%A7%C3%A3o';
                }

                await fetch(pushcutUrl, {
                    method: 'POST'
                });
                console.log(`Pushcut notification sent successfully to: ${pushcutUrl}`);
            } catch (pushError) {
                console.error('Pushcut Error:', pushError);
                // Don't fail the main request if notification fails
            }
        }
        // ---------------------------

        return res.status(200).json({ success: true, data });
    } catch (error) {
        console.error('Server Error:', error);
        return res.status(500).json({ error: 'Internal Server Error', details: error.message });
    }
}
