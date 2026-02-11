// supabase/functions/uazapi-webhook/index.ts

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response(null, { headers: corsHeaders });
    }

    if (req.method !== 'POST') {
        return new Response('Method Not Allowed', { status: 405 });
    }

    try {
        const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
        const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
        const supabase = createClient(supabaseUrl, supabaseKey);

        const body = await req.json();
        console.log('[UazAPI Webhook] Received:', JSON.stringify(body).substring(0, 500));

        const event = body.event || body.type;
        const instanceId = body.instance || body.instanceId;
        const data = body.data || body;

        // ============================================
        // Buscar conexão pela instance_id
        // ============================================
        if (!instanceId) {
            console.log('[UazAPI Webhook] No instance ID');
            return new Response(JSON.stringify({ success: true }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        }

        const { data: whatsapp } = await supabase
            .from('whatsapps')
            .select('id, company_id, default_queue_id')
            .or(`uazapi_instance_id.eq.${instanceId},instance_id.eq.${instanceId}`)
            .eq('provider', 'uazapi')
            .limit(1)
            .single();

        if (!whatsapp) {
            console.warn('[UazAPI Webhook] No connection found for instance:', instanceId);
            return new Response(JSON.stringify({ error: 'Connection not found' }), {
                status: 401,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        }

        // ============================================
        // EVENTO: connection (status da conexão)
        // ============================================
        if (event === 'connection' || event === 'status') {
            const status = data.state || data.status;
            console.log('[UazAPI Webhook] Connection status:', status);

            const statusMap: Record<string, string> = {
                'open': 'CONNECTED',
                'connected': 'CONNECTED',
                'close': 'DISCONNECTED',
                'disconnected': 'DISCONNECTED',
                'connecting': 'CONNECTING',
            };

            const mappedStatus = statusMap[(status || '').toLowerCase()] || 'DISCONNECTED';

            await supabase
                .from('whatsapps')
                .update({ status: mappedStatus, updated_at: new Date().toISOString() })
                .eq('id', whatsapp.id);

            return new Response(JSON.stringify({ success: true }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        }

        // ============================================
        // EVENTO: qrcode
        // ============================================
        if (event === 'qrcode' || event === 'qr') {
            const qrCode = data.qrcode || data.base64 || data.qr;
            if (qrCode) {
                await supabase
                    .from('whatsapps')
                    .update({ qr_code: qrCode, status: 'WAITING_QR', updated_at: new Date().toISOString() })
                    .eq('id', whatsapp.id);
            }
            return new Response(JSON.stringify({ success: true }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        }

        // ============================================
        // EVENTO: message.ack (status de leitura)
        // ============================================
        if (event === 'message.ack' || event === 'ack') {
            const messageId = data.id || data.key?.id;
            const ack = data.ack ?? data.status;

            if (messageId && ack !== undefined) {
                await supabase
                    .from('messages')
                    .update({ ack: Number(ack) })
                    .eq('wid', messageId);
            }
            return new Response(JSON.stringify({ success: true }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        }

        // ============================================
        // EVENTO: message (mensagem recebida)
        // ============================================
        if (event === 'message' || event === 'messages.upsert') {
            const key = data.key || {};
            const remoteJid = key.remoteJid || data.from;
            const fromMe = key.fromMe || false;
            const messageId = key.id || data.id;

            if (fromMe) {
                console.log('[UazAPI Webhook] Ignoring fromMe message');
                return new Response(JSON.stringify({ success: true }), {
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
                });
            }

            const phoneNumber = (remoteJid || '').replace('@s.whatsapp.net', '').replace('@g.us', '').replace(/\D/g, '');
            const contactName = data.pushName || data.verifiedBizName || phoneNumber;
            const isGroup = (remoteJid || '').endsWith('@g.us');

            // Extrair conteúdo da mensagem
            const msg = data.message || {};
            let messageBody = '';
            let mediaUrl: string | null = null;
            let mediaType: string | null = null;

            if (msg.conversation) {
                messageBody = msg.conversation;
            } else if (msg.extendedTextMessage?.text) {
                messageBody = msg.extendedTextMessage.text;
            } else if (msg.imageMessage) {
                messageBody = msg.imageMessage.caption || '[Imagem]';
                mediaType = 'image';
                mediaUrl = msg.imageMessage.url || null;
            } else if (msg.videoMessage) {
                messageBody = msg.videoMessage.caption || '[Vídeo]';
                mediaType = 'video';
                mediaUrl = msg.videoMessage.url || null;
            } else if (msg.audioMessage) {
                messageBody = '[Áudio]';
                mediaType = 'audio';
                mediaUrl = msg.audioMessage.url || null;
            } else if (msg.documentMessage) {
                messageBody = msg.documentMessage.fileName || '[Documento]';
                mediaType = 'document';
                mediaUrl = msg.documentMessage.url || null;
            } else if (msg.stickerMessage) {
                messageBody = '[Sticker]';
                mediaType = 'sticker';
            } else if (msg.locationMessage) {
                messageBody = `📍 Localização: ${msg.locationMessage.degreesLatitude}, ${msg.locationMessage.degreesLongitude}`;
            } else if (msg.contactMessage || msg.contactsArrayMessage) {
                messageBody = '📇 Contato compartilhado';
            } else if (msg.buttonsResponseMessage) {
                messageBody = msg.buttonsResponseMessage.selectedDisplayText || msg.buttonsResponseMessage.selectedButtonId || '[Resposta de botão]';
            } else if (msg.listResponseMessage) {
                messageBody = msg.listResponseMessage.title || msg.listResponseMessage.singleSelectReply?.selectedRowId || '[Resposta de lista]';
            } else {
                messageBody = data.body || data.text || '[Mensagem não suportada]';
            }

            if (!phoneNumber) {
                console.log('[UazAPI Webhook] No phone number');
                return new Response(JSON.stringify({ success: true }), {
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
                });
            }

            // Dedup
            if (messageId) {
                const { data: existingMsg } = await supabase
                    .from('messages')
                    .select('id')
                    .eq('wid', messageId)
                    .maybeSingle();

                if (existingMsg) {
                    console.log('[UazAPI Webhook] Duplicate message ignored:', messageId);
                    return new Response(JSON.stringify({ success: true }), {
                        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
                    });
                }
            }

            // Find or create contact
            let contact: any = null;
            const { data: existingContact } = await supabase
                .from('contacts')
                .select('id, name, number, messages_received')
                .eq('company_id', whatsapp.company_id)
                .eq('number', phoneNumber)
                .single();

            if (existingContact) {
                contact = existingContact;
                if (contactName && contactName !== phoneNumber && existingContact.name !== contactName) {
                    await supabase
                        .from('contacts')
                        .update({ profile_name: contactName, updated_at: new Date().toISOString() })
                        .eq('id', contact.id);
                }
            } else {
                const { data: newContact } = await supabase
                    .from('contacts')
                    .insert({
                        company_id: whatsapp.company_id,
                        name: contactName,
                        number: phoneNumber,
                        profile_name: contactName,
                        is_group: isGroup
                    })
                    .select('id, name, number, messages_received')
                    .single();
                contact = newContact;

                // Auto-criar member com status inactive
                if (contact && !isGroup) {
                    await supabase
                        .from('members')
                        .insert({
                            company_id: whatsapp.company_id,
                            contact_id: contact.id,
                            status: 'inactive'
                        })
                        .catch(() => { });
                }
            }

            if (!contact) {
                console.error('[UazAPI Webhook] Failed to find/create contact');
                return new Response(JSON.stringify({ success: true }), {
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
                });
            }

            // Find or create ticket
            let ticket: any = null;
            const { data: existingTicket } = await supabase
                .from('tickets')
                .select('id, status, user_id, chatbot, queue_id')
                .eq('company_id', whatsapp.company_id)
                .eq('contact_id', contact.id)
                .in('status', ['open', 'pending'])
                .order('created_at', { ascending: false })
                .limit(1)
                .single();

            if (existingTicket) {
                ticket = existingTicket;
                if (!ticket.queue_id && whatsapp.default_queue_id) {
                    await supabase.from('tickets').update({ queue_id: whatsapp.default_queue_id }).eq('id', ticket.id);
                }
            } else {
                const { data: newTicket } = await supabase
                    .from('tickets')
                    .insert({
                        company_id: whatsapp.company_id,
                        contact_id: contact.id,
                        whatsapp_id: whatsapp.id,
                        queue_id: whatsapp.default_queue_id || null,
                        status: 'pending',
                        last_message: messageBody,
                        is_group: isGroup
                    })
                    .select('id, status, user_id, chatbot, queue_id')
                    .single();
                ticket = newTicket;
            }

            if (!ticket) {
                console.error('[UazAPI Webhook] Failed to find/create ticket');
                return new Response(JSON.stringify({ success: true }), {
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
                });
            }

            // Salvar mensagem
            const timestamp = data.messageTimestamp
                ? new Date(Number(data.messageTimestamp) * 1000).toISOString()
                : new Date().toISOString();

            await supabase.from('messages').insert({
                company_id: whatsapp.company_id,
                ticket_id: ticket.id,
                contact_id: contact.id,
                body: messageBody || '[mensagem sem texto]',
                from_me: false,
                is_read: false,
                wid: messageId,
                remote_jid: remoteJid,
                media_url: mediaUrl,
                media_type: mediaType,
                ack: 2,
                created_at: timestamp,
                data_json: { source: 'uazapi', originalPayload: body }
            });

            // Atualizar ticket
            await supabase.from('tickets').update({
                last_message: messageBody || '[mídia]',
                updated_at: new Date().toISOString()
            }).eq('id', ticket.id);

            // Atualizar contato
            await supabase.from('contacts').update({
                last_interaction_at: new Date().toISOString(),
                messages_received: (contact.messages_received || 0) + 1
            }).eq('id', contact.id);

            // ============================================
            // TRIGGER AI AGENT (fire & forget)
            // ============================================
            if (messageBody && !isGroup) {
                fetch(`${supabaseUrl}/functions/v1/ai-agent-process`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${supabaseKey}`
                    },
                    body: JSON.stringify({
                        ticketId: ticket.id,
                        message: messageBody,
                        companyId: whatsapp.company_id
                    })
                }).catch(err => console.error('[UazAPI Webhook] AI trigger error:', err));
            }

            console.log('[UazAPI Webhook] Message processed for ticket:', ticket.id);
        }

        return new Response(JSON.stringify({ success: true }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });

    } catch (error) {
        console.error('[UazAPI Webhook] Error:', error);
        return new Response(JSON.stringify({ error: 'Internal error' }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }
});
