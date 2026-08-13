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
        const PIXEL_ID = '2187535935146540';
        const ACCESS_TOKEN = 'EAAO4oAeNUY0BSALJmp9tgIEAXW7CrEEaOUvAXUr1DJR7gKkVmosYMgutBFZA0AyDUXYkpZA8OSlOyzInxdZCZCJIlT0JiFsGZA9UrKPa2bQNXbf7Txd8Oka7TylUxzX6RUDYUOzmZB7NZAWO3RwCDpO2YBmXkJ7jbZBEPzpmRYD5kUEEW3J2Smdrj7Bx4D5LiAZDZD';

        const { event_name, event_source_url, fbp, fbc, event_id, payment_method } = req.body;

        // Get client IP and User Agent
        const client_ip_address = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
        const client_user_agent = req.headers['user-agent'];

        const eventData = {
            data: [
                {
                    event_name: event_name || 'Purchase',
                    event_time: Math.floor(Date.now() / 1000),
                    event_id: event_id, // Shared ID for deduplication
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
                        value: 69.00, // Shared value with Pixel
                    },
                },
            ],
            access_token: ACCESS_TOKEN,
        };

        console.log('Sending event to Meta:', JSON.stringify(eventData, null, 2));

        // --- PUSHCUT INTEGRATION — dispara ANTES da checagem de erro da Meta ---
        if (event_name === 'Purchase') {
            try {
                const pushcutUrl = 'https://api.pushcut.io/3X4w6yEnDKjUAX62qRmMx/notifications/op-spi-mexico-dnt-peludos';
                console.log('Enviando Pushcut para:', pushcutUrl);
                const pushRes = await fetch(pushcutUrl, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        title: '💰Venda Realizada!',
                        text: 'Valor: U$100,00'
                    })
                });
                console.log('Pushcut status:', pushRes.status);
            } catch (pushError) {
                console.error('Pushcut Error:', pushError);
            }
        }
        // -----------------------------------------------------------------------

        const response = await fetch(
            `https://graph.facebook.com/v19.0/${PIXEL_ID}/events`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(eventData),
            }
        );

        const data = await response.json();

        if (!response.ok) {
            console.error('Meta API Error:', data);
            return res.status(response.status).json(data);
        }

        return res.status(200).json({ success: true, data });
    } catch (error) {
        console.error('Server Error:', error);
        return res.status(500).json({ error: 'Internal Server Error', details: error.message });
    }
}
