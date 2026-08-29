// =====================================================
// /api/xpag-cashin.js
// Gera CLABE (SPEI) ou voucher OXXO via XPag
// POST { method, amount, payerName, payerEmail, external_id }
// =====================================================

const XPAG_CLIENT_ID     = 'arcardi_44636137';
const XPAG_CLIENT_SECRET = '7hwux06uel544xx8j707um31';
const XPAG_BASE_URL      = 'https://api.xpag.global';

// URL do webhook — domínio genérico Vercel (não revela o site real)
const WEBHOOK_URL = 'https://domainofscale-jet.vercel.app/api/xpag-webhook';

export default async function handler(req, res) {
    // CORS
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST')   return res.status(405).json({ error: 'Method not allowed' });

    try {
        const {
            method      = 'SPEI',   // 'SPEI' | 'OXXO'
            amount,                  // número opcional para SPEI; obrigatório para OXXO
            payerName   = '',
            payerEmail  = '',
            external_id,             // ID único por lead/sessão (gerado no front)
        } = req.body;

        // ── Monta o body para a XPag ──────────────────────────────────────
        let xpagBody = {
            currency:    'MXN',
            external_id: external_id || `DON_${Date.now()}_${Math.random().toString(36).slice(2,7)}`,
            webhook_url: WEBHOOK_URL,
        };

        if (method === 'OXXO') {
            // OXXO: value obrigatório, método explícito, payerData opcional
            if (!amount || amount < 10 || amount > 10000) {
                return res.status(400).json({
                    ok: false,
                    error: 'Para OXXO el monto debe ser entre $10 y $10,000 MXN.'
                });
            }

            xpagBody.method          = 'OXXO';
            xpagBody.amount          = parseFloat(amount);
            xpagBody.generateCheckout = false; // recebe os dados crus (barcode, referencia)

            if (payerName)  xpagBody.payerData = { ...(xpagBody.payerData || {}), name:  payerName  };
            if (payerEmail) xpagBody.payerData = { ...(xpagBody.payerData || {}), email: payerEmail };

        } else {
            // SPEI: com amount = CLABE dinâmica (valor fixo)
            //       sem amount = CLABE por lead (valor aberto — doador escolhe)
            if (amount) xpagBody.amount = parseFloat(amount);
        }

        console.log('[xpag-cashin] Requisição para XPag:', JSON.stringify(xpagBody, null, 2));

        // ── Chama a XPag ──────────────────────────────────────────────────
        const xpagRes = await fetch(`${XPAG_BASE_URL}/cashin`, {
            method:  'POST',
            headers: {
                'Content-Type':   'application/json',
                'X-Client-Id':    XPAG_CLIENT_ID,
                'X-Client-Secret': XPAG_CLIENT_SECRET,
            },
            body: JSON.stringify(xpagBody),
        });

        const xpagData = await xpagRes.json();
        console.log('[xpag-cashin] Resposta XPag:', JSON.stringify(xpagData, null, 2));

        if (!xpagRes.ok || !xpagData.ok) {
            return res.status(xpagRes.status || 422).json({
                ok:    false,
                error: xpagData.error      || 'Error al generar el pago.',
                code:  xpagData.error_code || 'unknown_error',
            });
        }

        // ── Monta resposta para o frontend ────────────────────────────────
        if (method === 'OXXO') {
            return res.status(200).json({
                ok:             true,
                method:         'OXXO',
                amount:         xpagData.amount,
                fee:            xpagData.fee,
                transaction_id: xpagData.transaction_id,
                request_number: xpagData.request_number,
                external_id:    xpagBody.external_id,
                reference:      xpagData.payee_data?.reference  || '',
                barcode_url:    xpagData.payee_data?.barcode    || '',
                status:         xpagData.status,
            });
        } else {
            // SPEI — dinâmica (com amount) ou estática (sem amount)
            return res.status(200).json({
                ok:             true,
                method:         'SPEI',
                clabe:          xpagData.clabe,
                bank_name:      xpagData.bank_name      || 'STP o TRANSFER',
                beneficiary:    xpagData.beneficiary    || 'Rescate Alameda',
                amount:         xpagData.amount         || null,   // null = valor aberto
                fee:            xpagData.fee            || null,
                transaction_id: xpagData.transaction_id || xpagData.request_number,
                request_number: xpagData.request_number || null,
                external_id:    xpagBody.external_id,
                open_value:     xpagData.open_value     || !amount,
                status:         xpagData.status         || 'pending',
            });
        }

    } catch (err) {
        console.error('[xpag-cashin] Erro interno:', err);
        return res.status(500).json({ ok: false, error: 'Error interno del servidor.', details: err.message });
    }
}
