import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-api-key',
};

interface ApiToken {
  id: string;
  company_id: string;
  name: string;
  permissions: string[];
  is_active: boolean;
  expires_at: string | null;
}

serve(async (req) => {
  const startTime = Date.now();

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  const url = new URL(req.url);
  const pathParts = url.pathname.split('/').filter(Boolean);
  // Remove 'external-api' from path
  const endpoint = pathParts.slice(1).join('/') || '';
  const method = req.method;

  // Get API key from header or query param
  const apiKey = req.headers.get('x-api-key') ||
    req.headers.get('authorization')?.replace('Bearer ', '') ||
    url.searchParams.get('api_key');

  console.log(`[External API] ${method} /${endpoint} - Key: ${apiKey ? 'present' : 'missing'}`);

  // Helper to sanitize sensitive data
  const sanitizeBody = (body: any): any => {
    if (!body) return body;
    if (typeof body !== 'object') return body;

    const sensitiveKeys = ['password', 'token', 'key', 'secret', 'authorization', 'api_key'];

    if (Array.isArray(body)) {
      return body.map(item => sanitizeBody(item));
    }

    const sanitized = { ...body };
    for (const key in sanitized) {
      if (sensitiveKeys.some(k => key.toLowerCase().includes(k))) {
        sanitized[key] = '***';
      } else if (typeof sanitized[key] === 'object') {
        sanitized[key] = sanitizeBody(sanitized[key]);
      }
    }
    return sanitized;
  };

  // Helper to log API request
  const logRequest = async (
    companyId: string | null,
    tokenId: string | null,
    status: number,
    responseBody: unknown,
    requestBody: unknown = null
  ) => {
    try {
      await supabase.from('api_logs').insert({
        company_id: companyId,
        api_token_id: tokenId,
        endpoint: `/${endpoint}`,
        method,
        request_body: sanitizeBody(requestBody),
        response_status: status,
        response_body: responseBody, // Might want to sanitize this too if responses contain secrets
        ip_address: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip'),
        user_agent: req.headers.get('user-agent'),
        duration_ms: Date.now() - startTime,
      });
    } catch (err) {
      console.error('Error logging request:', err);
    }
  };
  duration_ms: Date.now() - startTime,
      });
    } catch (e) {
  console.error('Failed to log API request:', e);
}
  };

// Helper to return JSON response
const jsonResponse = (data: unknown, status = 200) => {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
};

// Handle docs endpoint (no auth required)
if (endpoint === '' || endpoint === 'docs') {
  const docs = {
    name: "CoDatendechat External API",
    version: "1.0.0",
    base_url: `${supabaseUrl}/functions/v1/external-api`,
    authentication: {
      type: "API Key",
      header: "x-api-key",
      description: "Pass your API key in the x-api-key header or as Bearer token in Authorization header"
    },
    endpoints: {
      "GET /contacts": {
        description: "List contacts",
        permissions: ["contacts:read"],
        query_params: {
          limit: "number (default: 50, max: 100)",
          offset: "number (default: 0)",
          search: "string (search by name or number)"
        }
      },
      "GET /contacts/:id": {
        description: "Get contact by ID",
        permissions: ["contacts:read"]
      },
      "POST /contacts": {
        description: "Create a new contact",
        permissions: ["contacts:write"],
        body: {
          name: "string (required)",
          number: "string (required)",
          email: "string (optional)"
        }
      },
      "PUT /contacts/:id": {
        description: "Update a contact",
        permissions: ["contacts:write"],
        body: {
          name: "string",
          number: "string",
          email: "string"
        }
      },
      "GET /tickets": {
        description: "List tickets",
        permissions: ["tickets:read"],
        query_params: {
          status: "open|pending|closed",
          limit: "number (default: 50, max: 100)",
          offset: "number (default: 0)"
        }
      },
      "GET /tickets/:id": {
        description: "Get ticket by ID with messages",
        permissions: ["tickets:read"]
      },
      "POST /tickets": {
        description: "Create a new ticket",
        permissions: ["tickets:write"],
        body: {
          contact_id: "string (required)",
          queue_id: "string (optional)",
          status: "open|pending (default: open)"
        }
      },
      "PUT /tickets/:id": {
        description: "Update a ticket",
        permissions: ["tickets:write"],
        body: {
          status: "open|pending|closed",
          queue_id: "string",
          user_id: "string"
        }
      },
      "POST /messages/send": {
        description: "Send a message",
        permissions: ["messages:write"],
        body: {
          number: "string (required if no ticket_id)",
          ticket_id: "string (required if no number)",
          message: "string (required)",
          media_url: "string (optional)"
        }
      },
      "GET /messages": {
        description: "List messages",
        permissions: ["messages:read"],
        query_params: {
          ticket_id: "string (required)",
          limit: "number (default: 50, max: 100)",
          offset: "number (default: 0)"
        }
      },
      "GET /queues": {
        description: "List queues",
        permissions: ["queues:read"]
      },
      "GET /tags": {
        description: "List tags",
        permissions: ["tags:read"]
      },
      "GET /whatsapps": {
        description: "List WhatsApp connections",
        permissions: ["whatsapps:read"]
      }
    }
  };
  return jsonResponse(docs);
}

// Validate API key
if (!apiKey) {
  const error = { error: 'API key required', code: 'AUTH_REQUIRED' };
  await logRequest(null, null, 401, error);
  return jsonResponse(error, 401);
}

// Fetch token from database
const { data: tokenData, error: tokenError } = await supabase
  .from('api_tokens')
  .select('*')
  .eq('token', apiKey)
  .eq('is_active', true)
  .maybeSingle();

if (tokenError || !tokenData) {
  const error = { error: 'Invalid API key', code: 'INVALID_KEY' };
  await logRequest(null, null, 401, error);
  return jsonResponse(error, 401);
}

const token = tokenData as ApiToken;

// Check expiration
if (token.expires_at && new Date(token.expires_at) < new Date()) {
  const error = { error: 'API key expired', code: 'KEY_EXPIRED' };
  await logRequest(token.company_id, token.id, 401, error);
  return jsonResponse(error, 401);
}

// Update last used timestamp
await supabase
  .from('api_tokens')
  .update({ last_used_at: new Date().toISOString() })
  .eq('id', token.id);

// Check permissions
const checkPermission = (required: string): boolean => {
  if (token.permissions.includes('*') || token.permissions.includes('all')) return true;
  return token.permissions.includes(required);
};

const companyId = token.company_id;
let requestBody: unknown = null;

try {
  if (['POST', 'PUT', 'PATCH'].includes(method)) {
    requestBody = await req.json().catch(() => ({}));
  }
} catch {
  requestBody = {};
}

try {
  // Route handlers
  const [resource, resourceId, subResource] = endpoint.split('/');

  // CONTACTS
  if (resource === 'contacts') {
    if (method === 'GET' && !resourceId) {
      if (!checkPermission('contacts:read')) {
        const error = { error: 'Permission denied', code: 'FORBIDDEN' };
        await logRequest(companyId, token.id, 403, error);
        return jsonResponse(error, 403);
      }

      const limit = Math.min(parseInt(url.searchParams.get('limit') || '50'), 100);
      const offset = parseInt(url.searchParams.get('offset') || '0');
      const search = url.searchParams.get('search');

      let query = supabase
        .from('contacts')
        .select('*', { count: 'exact' })
        .eq('company_id', companyId)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (search) {
        query = query.or(`name.ilike.%${search}%,number.ilike.%${search}%`);
      }

      const { data, error, count } = await query;

      if (error) throw error;

      const response = { data, total: count, limit, offset };
      await logRequest(companyId, token.id, 200, { total: count });
      return jsonResponse(response);
    }

    if (method === 'GET' && resourceId) {
      if (!checkPermission('contacts:read')) {
        const error = { error: 'Permission denied', code: 'FORBIDDEN' };
        await logRequest(companyId, token.id, 403, error);
        return jsonResponse(error, 403);
      }

      const { data, error } = await supabase
        .from('contacts')
        .select('*')
        .eq('id', resourceId)
        .eq('company_id', companyId)
        .maybeSingle();

      if (error) throw error;
      if (!data) {
        const err = { error: 'Contact not found', code: 'NOT_FOUND' };
        await logRequest(companyId, token.id, 404, err);
        return jsonResponse(err, 404);
      }

      await logRequest(companyId, token.id, 200, { id: data.id });
      return jsonResponse({ data });
    }

    if (method === 'POST') {
      if (!checkPermission('contacts:write')) {
        const error = { error: 'Permission denied', code: 'FORBIDDEN' };
        await logRequest(companyId, token.id, 403, error, requestBody);
        return jsonResponse(error, 403);
      }

      const body = requestBody as { name?: string; number?: string; email?: string };
      if (!body.name || !body.number) {
        const error = { error: 'Name and number are required', code: 'VALIDATION_ERROR' };
        await logRequest(companyId, token.id, 400, error, requestBody);
        return jsonResponse(error, 400);
      }

      const { data, error } = await supabase
        .from('contacts')
        .insert({
          company_id: companyId,
          name: body.name,
          number: body.number,
          email: body.email || null,
        })
        .select()
        .single();

      if (error) throw error;

      await logRequest(companyId, token.id, 201, { id: data.id }, requestBody);
      return jsonResponse({ data }, 201);
    }

    if (method === 'PUT' && resourceId) {
      if (!checkPermission('contacts:write')) {
        const error = { error: 'Permission denied', code: 'FORBIDDEN' };
        await logRequest(companyId, token.id, 403, error, requestBody);
        return jsonResponse(error, 403);
      }

      const body = requestBody as { name?: string; number?: string; email?: string };

      const { data, error } = await supabase
        .from('contacts')
        .update({
          ...(body.name && { name: body.name }),
          ...(body.number && { number: body.number }),
          ...(body.email !== undefined && { email: body.email }),
        })
        .eq('id', resourceId)
        .eq('company_id', companyId)
        .select()
        .single();

      if (error) throw error;

      await logRequest(companyId, token.id, 200, { id: data.id }, requestBody);
      return jsonResponse({ data });
    }
  }

  // TICKETS
  if (resource === 'tickets') {
    if (method === 'GET' && !resourceId) {
      if (!checkPermission('tickets:read')) {
        const error = { error: 'Permission denied', code: 'FORBIDDEN' };
        await logRequest(companyId, token.id, 403, error);
        return jsonResponse(error, 403);
      }

      const limit = Math.min(parseInt(url.searchParams.get('limit') || '50'), 100);
      const offset = parseInt(url.searchParams.get('offset') || '0');
      const status = url.searchParams.get('status');

      let query = supabase
        .from('tickets')
        .select('*, contact:contacts(*), queue:queues(id, name, color)', { count: 'exact' })
        .eq('company_id', companyId)
        .order('updated_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (status) {
        query = query.eq('status', status);
      }

      const { data, error, count } = await query;

      if (error) throw error;

      const response = { data, total: count, limit, offset };
      await logRequest(companyId, token.id, 200, { total: count });
      return jsonResponse(response);
    }

    if (method === 'GET' && resourceId) {
      if (!checkPermission('tickets:read')) {
        const error = { error: 'Permission denied', code: 'FORBIDDEN' };
        await logRequest(companyId, token.id, 403, error);
        return jsonResponse(error, 403);
      }

      const { data: ticket, error } = await supabase
        .from('tickets')
        .select('*, contact:contacts(*), queue:queues(id, name, color)')
        .eq('id', resourceId)
        .eq('company_id', companyId)
        .maybeSingle();

      if (error) throw error;
      if (!ticket) {
        const err = { error: 'Ticket not found', code: 'NOT_FOUND' };
        await logRequest(companyId, token.id, 404, err);
        return jsonResponse(err, 404);
      }

      // Get messages if requested
      const includeMessages = url.searchParams.get('include_messages') === 'true';
      let messages = [];
      if (includeMessages) {
        const { data: msgs } = await supabase
          .from('messages')
          .select('*')
          .eq('ticket_id', resourceId)
          .order('created_at', { ascending: true })
          .limit(100);
        messages = msgs || [];
      }

      await logRequest(companyId, token.id, 200, { id: ticket.id });
      return jsonResponse({ data: { ...ticket, messages } });
    }

    if (method === 'POST') {
      if (!checkPermission('tickets:write')) {
        const error = { error: 'Permission denied', code: 'FORBIDDEN' };
        await logRequest(companyId, token.id, 403, error, requestBody);
        return jsonResponse(error, 403);
      }

      const body = requestBody as { contact_id?: string; queue_id?: string; status?: string };
      if (!body.contact_id) {
        const error = { error: 'contact_id is required', code: 'VALIDATION_ERROR' };
        await logRequest(companyId, token.id, 400, error, requestBody);
        return jsonResponse(error, 400);
      }

      const { data, error } = await supabase
        .from('tickets')
        .insert({
          company_id: companyId,
          contact_id: body.contact_id,
          queue_id: body.queue_id || null,
          status: body.status || 'open',
        })
        .select()
        .single();

      if (error) throw error;

      await logRequest(companyId, token.id, 201, { id: data.id }, requestBody);
      return jsonResponse({ data }, 201);
    }

    if (method === 'PUT' && resourceId) {
      if (!checkPermission('tickets:write')) {
        const error = { error: 'Permission denied', code: 'FORBIDDEN' };
        await logRequest(companyId, token.id, 403, error, requestBody);
        return jsonResponse(error, 403);
      }

      const body = requestBody as { status?: string; queue_id?: string; user_id?: string };

      const { data, error } = await supabase
        .from('tickets')
        .update({
          ...(body.status && { status: body.status }),
          ...(body.queue_id !== undefined && { queue_id: body.queue_id }),
          ...(body.user_id !== undefined && { user_id: body.user_id }),
        })
        .eq('id', resourceId)
        .eq('company_id', companyId)
        .select()
        .single();

      if (error) throw error;

      await logRequest(companyId, token.id, 200, { id: data.id }, requestBody);
      return jsonResponse({ data });
    }
  }

  // MESSAGES
  if (resource === 'messages') {
    if (method === 'GET') {
      if (!checkPermission('messages:read')) {
        const error = { error: 'Permission denied', code: 'FORBIDDEN' };
        await logRequest(companyId, token.id, 403, error);
        return jsonResponse(error, 403);
      }

      const ticketId = url.searchParams.get('ticket_id');
      if (!ticketId) {
        const error = { error: 'ticket_id is required', code: 'VALIDATION_ERROR' };
        await logRequest(companyId, token.id, 400, error);
        return jsonResponse(error, 400);
      }

      const limit = Math.min(parseInt(url.searchParams.get('limit') || '50'), 100);
      const offset = parseInt(url.searchParams.get('offset') || '0');

      const { data, error, count } = await supabase
        .from('messages')
        .select('*', { count: 'exact' })
        .eq('ticket_id', ticketId)
        .eq('company_id', companyId)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) throw error;

      const response = { data, total: count, limit, offset };
      await logRequest(companyId, token.id, 200, { total: count });
      return jsonResponse(response);
    }

    if (method === 'POST' && resourceId === 'send') {
      if (!checkPermission('messages:write')) {
        const error = { error: 'Permission denied', code: 'FORBIDDEN' };
        await logRequest(companyId, token.id, 403, error, requestBody);
        return jsonResponse(error, 403);
      }

      const body = requestBody as {
        number?: string;
        ticket_id?: string;
        message: string;
        media_url?: string;
        whatsapp_id?: string;
      };

      if (!body.message) {
        const error = { error: 'message is required', code: 'VALIDATION_ERROR' };
        await logRequest(companyId, token.id, 400, error, requestBody);
        return jsonResponse(error, 400);
      }

      if (!body.number && !body.ticket_id) {
        const error = { error: 'number or ticket_id is required', code: 'VALIDATION_ERROR' };
        await logRequest(companyId, token.id, 400, error, requestBody);
        return jsonResponse(error, 400);
      }

      // Get whatsapp connection
      let whatsappId = body.whatsapp_id;
      if (!whatsappId) {
        const { data: whatsapp } = await supabase
          .from('whatsapps')
          .select('id')
          .eq('company_id', companyId)
          .eq('status', 'CONNECTED')
          .eq('is_default', true)
          .maybeSingle();

        if (!whatsapp) {
          const { data: anyWhatsapp } = await supabase
            .from('whatsapps')
            .select('id')
            .eq('company_id', companyId)
            .eq('status', 'CONNECTED')
            .limit(1)
            .maybeSingle();

          whatsappId = anyWhatsapp?.id;
        } else {
          whatsappId = whatsapp.id;
        }
      }

      if (!whatsappId) {
        const error = { error: 'No connected WhatsApp found', code: 'NO_CONNECTION' };
        await logRequest(companyId, token.id, 400, error, requestBody);
        return jsonResponse(error, 400);
      }

      // Get number from ticket if not provided
      let number = body.number;
      const ticketId = body.ticket_id;

      if (ticketId && !number) {
        const { data: ticket } = await supabase
          .from('tickets')
          .select('contact:contacts(number)')
          .eq('id', ticketId)
          .maybeSingle();

        // Contact can be an array or object depending on the join
        const contact = ticket?.contact as unknown as { number: string } | { number: string }[] | null;
        if (Array.isArray(contact)) {
          number = contact[0]?.number;
        } else {
          number = contact?.number;
        }
      }

      if (!number) {
        const error = { error: 'Could not determine recipient number', code: 'VALIDATION_ERROR' };
        await logRequest(companyId, token.id, 400, error, requestBody);
        return jsonResponse(error, 400);
      }

      // Call send-message function
      const { data: sendResult, error: sendError } = await supabase.functions.invoke('send-message', {
        body: {
          whatsappId,
          number,
          message: body.message,
          mediaUrl: body.media_url,
          companyId,
        }
      });

      if (sendError) {
        const error = { error: 'Failed to send message', details: sendError.message, code: 'SEND_FAILED' };
        await logRequest(companyId, token.id, 500, error, requestBody);
        return jsonResponse(error, 500);
      }

      await logRequest(companyId, token.id, 200, { success: true }, requestBody);
      return jsonResponse({ success: true, data: sendResult });
    }
  }

  // QUEUES
  if (resource === 'queues' && method === 'GET') {
    if (!checkPermission('queues:read')) {
      const error = { error: 'Permission denied', code: 'FORBIDDEN' };
      await logRequest(companyId, token.id, 403, error);
      return jsonResponse(error, 403);
    }

    const { data, error } = await supabase
      .from('queues')
      .select('id, name, color, greeting_message, out_of_hours_message')
      .eq('company_id', companyId)
      .order('order_queue');

    if (error) throw error;

    await logRequest(companyId, token.id, 200, { count: data?.length });
    return jsonResponse({ data });
  }

  // TAGS
  if (resource === 'tags' && method === 'GET') {
    if (!checkPermission('tags:read')) {
      const error = { error: 'Permission denied', code: 'FORBIDDEN' };
      await logRequest(companyId, token.id, 403, error);
      return jsonResponse(error, 403);
    }

    const { data, error } = await supabase
      .from('tags')
      .select('id, name, color, kanban')
      .eq('company_id', companyId)
      .order('name');

    if (error) throw error;

    await logRequest(companyId, token.id, 200, { count: data?.length });
    return jsonResponse({ data });
  }

  // WHATSAPPS
  if (resource === 'whatsapps' && method === 'GET') {
    if (!checkPermission('whatsapps:read')) {
      const error = { error: 'Permission denied', code: 'FORBIDDEN' };
      await logRequest(companyId, token.id, 403, error);
      return jsonResponse(error, 403);
    }

    const { data, error } = await supabase
      .from('whatsapps')
      .select('id, name, status, is_default, provider')
      .eq('company_id', companyId)
      .order('name');

    if (error) throw error;

    await logRequest(companyId, token.id, 200, { count: data?.length });
    return jsonResponse({ data });
  }

  // Not found
  const error = { error: 'Endpoint not found', code: 'NOT_FOUND' };
  await logRequest(companyId, token.id, 404, error);
  return jsonResponse(error, 404);

} catch (error: unknown) {
  console.error('[External API] Error:', error);
  const errorMessage = error instanceof Error ? error.message : 'Unknown error';
  const err = { error: 'Internal server error', code: 'INTERNAL_ERROR', details: errorMessage };
  await logRequest(companyId, token.id, 500, err, requestBody);
  return jsonResponse(err, 500);
}
});
