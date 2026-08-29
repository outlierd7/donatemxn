// =====================================================
// /api/xpag-webhook.js
// Recebe confirmações de pagamento da XPag
// POST (disparado pela XPag quando status = confirmed)
// =====================================================
//
// Fluxo:
//   1. XPag confirma pagamento (SPEI ou OXXO)
//   2. Este endpoint recebe o webhook
//   3. Dispara Pushcut com valor real
//   4. Dispara Meta Conversions API (Purchase) com valor real
//   5. Responde 200 OK para a XPag
// =====================================================

const PIXEL_ID     = '2187535935146540';
const ACCESS_TOKEN = 'EAAO4oAeNUY0BSALJmp9tgIEAXW7CrEEaOUvAXUr1DJR7gKkVmosYMgutBFZA0AyDUXYkpZA8OSlOyzInxdZCZCJIlT0JiFsGZA9UrKPa2bQNXbf7Txd8Oka7TylUxzX6RUDYUOzmZB7NZAWO3RwCDpO2YBmXkJ7jbZBEPzpmRYD5kUEEW3J2Smdrj7Bx4D5LiAZDZD';

const PUSHCUT_URL  = 'https://api.pushcut.io/3X4w6yEnDKjUAX62qRmMx/notifications/op-spi-mexico-dnt-peludos';
const SITE_URL     = 'https://donatemxn.vercel.app/donacion/';

export default async function handler(req, res) {
    // Responde imediatamente 200 para a XPag não retentar
    // (processamos de forma assíncrona após)
    if (req.method === 'OPTIONS') return res.status(200).end();

    // A XPag só faz POST neste endpoint
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    const payload = req.body;
    console.log('[xpag-webhook] Payload recebido:', JSON.stringify(payload, null, 2));

    // Responde 200 imediatamente (boa prática para webhooks — evita timeout)
    res.status(200).json({ ok: true, received: true });

    // ── Filtra apenas pagamentos confirmados ──────────────────────────────
    if (payload.type !== 'cashin' || payload.status !== 'confirmed') {
        console.log(`[xpag-webhook] Ignorado: type=${payload.type} status=${payload.status}`);
        return;
    }

    const amount      = payload.amount      || 0;
    const currency    = payload.currency    || 'MXN';
    const external_id = payload.external_id || 'unknown';
    const e2e         = payload.e2e         || payload.transaction_id || 'unknown';
    const origin      = payload.origin      || 'dynamic'; // 'static' = CLABE fixa
    const method      = payload.method      === 'OXXO' ? 'OXXO' : 'SPEI';

    console.log(`[xpag-webhook] Pagamento CONFIRMADO — ${method} | ${currency} ${amount} | external_id: ${external_id} | e2e: ${e2e}`);

    // ── 1. Pushcut ────────────────────────────────────────────────────────
    try {
        const pushcutRes = await fetch(PUSHCUT_URL, {
            method:  'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                title: '💰 ¡Venda Realizada!',
                text:  `${method} | ${currency} $${amount.toFixed(2)} | ID: ${external_id}`,
            }),
        });
        console.log('[xpag-webhook] Pushcut status:', pushcutRes.status);
    } catch (pushErr) {
        console.error('[xpag-webhook] Erro Pushcut:', pushErr.message);
    }

    // ── 2. Meta Conversions API (CAPI) ────────────────────────────────────
    try {
        const eventId   = `xpag_purchase_${e2e}`;
        const timestamp = Math.floor(Date.now() / 1000);

        const metaPayload = {
            data: [{
                event_name:        'Purchase',
                event_time:        timestamp,
                event_id:          eventId,
                action_source:     'website',
                event_source_url:  SITE_URL,
                user_data: {
                    // Sem dados pessoais (fluxo anônimo)
                    // client_ip e user_agent não disponíveis no webhook server-side
                },
                custom_data: {
                    currency: currency,
                    value:    amount,
                    contents: [{
                        id:       `donation_${method.toLowerCase()}`,
                        quantity: 1,
                    }],
                    content_type: 'product',
                },
            }],
            access_token: ACCESS_TOKEN,
        };

        const metaRes = await fetch(
            `https://graph.facebook.com/v19.0/${PIXEL_ID}/events`,
            {
                method:  'POST',
                headers: { 'Content-Type': 'application/json' },
                body:    JSON.stringify(metaPayload),
            }
        );

        const metaData = await metaRes.json();
        console.log('[xpag-webhook] Meta CAPI status:', metaRes.status, JSON.stringify(metaData));
    } catch (metaErr) {
        console.error('[xpag-webhook] Erro Meta CAPI:', metaErr.message);
    }

    // ── Log final ─────────────────────────────────────────────────────────
    console.log(`[xpag-webhook] ✅ Processamento concluído — ${method} $${amount} ${currency}`);
}
