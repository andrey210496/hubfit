// supabase/functions/_shared/providers.ts

export interface WhatsAppConnection {
    id: string;
    company_id: string;
    provider: string;
    status: string;
    // COEX/Meta
    phone_number_id?: string;
    access_token?: string;
    // UazAPI
    uazapi_url?: string;
    uazapi_token?: string;
    uazapi_instance_id?: string;
    // Legacy (manter por compat.)
    instance_id?: string;
}

export interface SendMessageParams {
    to: string;
    body?: string;
    mediaUrl?: string;
    mediaType?: string;
    mimeType?: string;
    fileName?: string;
    quotedMsgId?: string;
    isGroup?: boolean;
}

export interface SendResult {
    success: boolean;
    messageId?: string;
    error?: string;
    provider: string;
}

// ============================================
// NORMALIZAÇÃO
// ============================================

function normalizePhone(to: string): string {
    const digits = String(to).replace(/\D/g, '');
    if (digits.length === 10 || digits.length === 11) return `55${digits}`;
    return digits;
}

function cleanPhoneForApi(to: string): string {
    return to.replace('@s.whatsapp.net', '').replace('@g.us', '').replace(/\D/g, '');
}

// ============================================
// UAZAPI PROVIDER
// ============================================

export async function sendViaUazAPI(
    connection: WhatsAppConnection,
    params: SendMessageParams
): Promise<SendResult> {
    const baseUrl = connection.uazapi_url?.replace(/\/+$/, '');
    const token = connection.uazapi_token;

    if (!baseUrl || !token) {
        return { success: false, error: 'UazAPI não configurada (URL ou Token ausente)', provider: 'uazapi' };
    }

    const phone = cleanPhoneForApi(params.to);

    try {
        let endpoint: string;
        let payload: any;

        if (params.mediaUrl) {
            const mediaType = (params.mediaType || '').toLowerCase();

            if (mediaType === 'image' || params.mimeType?.startsWith('image/')) {
                endpoint = `${baseUrl}/send/image`;
                payload = { phone, image: params.mediaUrl, caption: params.body || '' };
            } else if (mediaType === 'video' || params.mimeType?.startsWith('video/')) {
                endpoint = `${baseUrl}/send/video`;
                payload = { phone, video: params.mediaUrl, caption: params.body || '' };
            } else if (mediaType === 'audio' || params.mimeType?.startsWith('audio/')) {
                endpoint = `${baseUrl}/send/audio`;
                payload = { phone, audio: params.mediaUrl };
            } else {
                endpoint = `${baseUrl}/send/document`;
                payload = { phone, document: params.mediaUrl, fileName: params.fileName || 'document', caption: params.body || '' };
            }
        } else {
            endpoint = `${baseUrl}/send/text`;
            payload = { phone, message: params.body || '' };
        }

        console.log(`[UazAPI] Sending to ${endpoint}:`, JSON.stringify(payload).substring(0, 200));

        const response = await fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Token': token },
            body: JSON.stringify(payload)
        });

        const data = await response.json().catch(() => ({}));

        if (response.ok && (data.status === 'success' || data.id || data.messageId || response.status === 200)) {
            const msgId = data.id || data.messageId || data.key?.id || null;
            console.log('[UazAPI] Message sent:', msgId);
            return { success: true, messageId: msgId, provider: 'uazapi' };
        }

        console.error('[UazAPI] Send failed:', response.status, data);
        return { success: false, error: data.message || data.error || `HTTP ${response.status}`, provider: 'uazapi' };
    } catch (error: any) {
        console.error('[UazAPI] Error:', error);
        return { success: false, error: error.message, provider: 'uazapi' };
    }
}

// ============================================
// COEX / META CLOUD API PROVIDER
// ============================================

export async function sendViaCoex(
    connection: WhatsAppConnection,
    params: SendMessageParams
): Promise<SendResult> {
    const phoneNumberId = connection.phone_number_id;
    const accessToken = connection.access_token;

    if (!phoneNumberId || !accessToken) {
        return { success: false, error: 'COEX não configurada (phone_number_id ou access_token ausente)', provider: 'coex' };
    }

    if (params.isGroup) {
        return { success: false, error: 'Envio para grupos não é suportado pela API oficial', provider: 'coex' };
    }

    const recipientPhone = normalizePhone(params.to);

    try {
        const payload: any = { messaging_product: 'whatsapp', to: recipientPhone };

        if (params.mediaUrl) {
            const mediaType = (params.mediaType || '').toLowerCase();

            if (mediaType === 'image') {
                payload.type = 'image';
                payload.image = { link: params.mediaUrl, ...(params.body ? { caption: params.body } : {}) };
            } else if (mediaType === 'video') {
                payload.type = 'video';
                payload.video = { link: params.mediaUrl, ...(params.body ? { caption: params.body } : {}) };
            } else if (mediaType === 'audio') {
                payload.type = 'audio';
                payload.audio = { link: params.mediaUrl };
            } else {
                payload.type = 'document';
                payload.document = {
                    link: params.mediaUrl,
                    ...(params.fileName ? { filename: params.fileName } : {}),
                    ...(params.body ? { caption: params.body } : {}),
                };
            }
        } else {
            payload.type = 'text';
            payload.text = { body: params.body || '\u200b', preview_url: false };
        }

        const response = await fetch(
            `https://graph.facebook.com/v21.0/${phoneNumberId}/messages`,
            {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            }
        );

        const data = await response.json().catch(() => ({}));

        if (response.ok) {
            return { success: true, messageId: data.messages?.[0]?.id, provider: 'coex' };
        }

        return { success: false, error: data.error?.message || `HTTP ${response.status}`, provider: 'coex' };
    } catch (error: any) {
        console.error('[COEX] Error:', error);
        return { success: false, error: error.message, provider: 'coex' };
    }
}

// ============================================
// ROUTER — Escolhe provider automaticamente
// ============================================

export async function sendMessage(
    connection: WhatsAppConnection,
    params: SendMessageParams
): Promise<SendResult> {
    if (connection.status !== 'CONNECTED') {
        return { success: false, error: 'Conexão WhatsApp desconectada', provider: connection.provider || 'unknown' };
    }

    const provider = (connection.provider || '').toLowerCase();

    switch (provider) {
        case 'uazapi':
            return sendViaUazAPI(connection, params);

        case 'coex':
        case 'meta':
        case 'cloud_api':
            return sendViaCoex(connection, params);

        default:
            if (connection.uazapi_url && connection.uazapi_token) {
                return sendViaUazAPI(connection, params);
            }
            if (connection.phone_number_id && connection.access_token) {
                return sendViaCoex(connection, params);
            }
            return { success: false, error: `Provider desconhecido: ${provider}`, provider: provider || 'none' };
    }
}
