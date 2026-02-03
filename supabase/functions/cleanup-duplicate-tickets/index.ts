import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log('[Cleanup] Starting duplicate tickets cleanup...');

    // Step 1: Find duplicate tickets (same contact_id, company_id)
    const { data: duplicates, error: findError } = await supabase.rpc('find_duplicate_tickets');
    
    if (findError) {
      // If RPC doesn't exist, use raw query approach
      console.log('[Cleanup] RPC not found, using direct query approach');
      
      // Get all tickets grouped by contact and company
      const { data: allTickets, error: ticketsError } = await supabase
        .from('tickets')
        .select('id, contact_id, company_id, updated_at')
        .order('updated_at', { ascending: false });

      if (ticketsError) {
        throw new Error(`Failed to fetch tickets: ${ticketsError.message}`);
      }

      // Group tickets by contact_id + company_id
      const ticketGroups: Record<string, typeof allTickets> = {};
      for (const ticket of allTickets || []) {
        const key = `${ticket.contact_id}_${ticket.company_id}`;
        if (!ticketGroups[key]) {
          ticketGroups[key] = [];
        }
        ticketGroups[key].push(ticket);
      }

      // Find duplicates (groups with more than 1 ticket)
      let totalMerged = 0;
      let totalDeleted = 0;

      for (const [key, tickets] of Object.entries(ticketGroups)) {
        if (tickets.length <= 1) continue;

        // Sort by updated_at descending, keep the first (most recent)
        tickets.sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
        
        const keepTicket = tickets[0];
        const removeTickets = tickets.slice(1);

        console.log(`[Cleanup] Contact group ${key}: keeping ${keepTicket.id}, removing ${removeTickets.length} duplicates`);

        for (const oldTicket of removeTickets) {
          // Move messages to the kept ticket
          const { error: msgError } = await supabase
            .from('messages')
            .update({ ticket_id: keepTicket.id })
            .eq('ticket_id', oldTicket.id);

          if (msgError) {
            console.error(`[Cleanup] Failed to move messages from ${oldTicket.id}:`, msgError);
            continue;
          }

          // Delete related records
          await supabase.from('ticket_tracking').delete().eq('ticket_id', oldTicket.id);
          await supabase.from('ticket_notes').delete().eq('ticket_id', oldTicket.id);
          await supabase.from('ticket_tags').delete().eq('ticket_id', oldTicket.id);

          // Delete the duplicate ticket
          const { error: deleteError } = await supabase
            .from('tickets')
            .delete()
            .eq('id', oldTicket.id);

          if (deleteError) {
            console.error(`[Cleanup] Failed to delete ticket ${oldTicket.id}:`, deleteError);
          } else {
            totalDeleted++;
          }
        }

        totalMerged++;
      }

      console.log(`[Cleanup] Completed: ${totalMerged} contact groups processed, ${totalDeleted} duplicate tickets removed`);

      return new Response(JSON.stringify({ 
        success: true, 
        message: `Cleanup completed: ${totalDeleted} duplicate tickets removed`,
        groupsProcessed: totalMerged,
        ticketsRemoved: totalDeleted,
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ success: true, duplicates }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('[Cleanup] Error:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

