import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Simple encryption using AES-GCM
const ENCRYPTION_KEY = Deno.env.get("LLM_ENCRYPTION_KEY") || Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")?.substring(0, 32);

async function encrypt(text: string): Promise<string> {
  const encoder = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    encoder.encode(ENCRYPTION_KEY?.padEnd(32, "0").substring(0, 32)),
    { name: "AES-GCM" },
    false,
    ["encrypt"]
  );
  
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encrypted = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    keyMaterial,
    encoder.encode(text)
  );
  
  const combined = new Uint8Array(iv.length + new Uint8Array(encrypted).length);
  combined.set(iv);
  combined.set(new Uint8Array(encrypted), iv.length);
  
  return btoa(String.fromCharCode(...combined));
}

async function decrypt(encryptedText: string): Promise<string> {
  const encoder = new TextEncoder();
  const decoder = new TextDecoder();
  
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    encoder.encode(ENCRYPTION_KEY?.padEnd(32, "0").substring(0, 32)),
    { name: "AES-GCM" },
    false,
    ["decrypt"]
  );
  
  const combined = Uint8Array.from(atob(encryptedText), c => c.charCodeAt(0));
  const iv = combined.slice(0, 12);
  const encrypted = combined.slice(12);
  
  const decrypted = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv },
    keyMaterial,
    encrypted
  );
  
  return decoder.decode(decrypted);
}

function maskApiKey(apiKey: string): string {
  if (!apiKey || apiKey.length < 10) return "***";
  const prefix = apiKey.substring(0, 7);
  const suffix = apiKey.substring(apiKey.length - 3);
  return `${prefix}...${suffix}`;
}

async function testOpenAI(apiKey: string, model: string = "gpt-4o-mini"): Promise<{ success: boolean; error?: string; details?: any }> {
  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        messages: [{ role: "user", content: "Say 'Connection successful!' in 5 words or less." }],
        max_tokens: 20,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return {
        success: false,
        error: errorData.error?.message || `HTTP ${response.status}: ${response.statusText}`,
      };
    }

    const data = await response.json();
    return {
      success: true,
      details: {
        test_response: data.choices?.[0]?.message?.content,
        model: data.model,
        response_time_ms: data.usage?.total_tokens,
      },
    };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

async function testGemini(apiKey: string, model: string = "gemini-2.0-flash"): Promise<{ success: boolean; error?: string; details?: any }> {
  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: "Say 'Connection successful!' in 5 words or less." }] }],
          generationConfig: { maxOutputTokens: 20 },
        }),
      }
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return {
        success: false,
        error: errorData.error?.message || `HTTP ${response.status}: ${response.statusText}`,
      };
    }

    const data = await response.json();
    return {
      success: true,
      details: {
        test_response: data.candidates?.[0]?.content?.parts?.[0]?.text,
        model,
      },
    };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    
    // Get user from auth header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Service role client for database operations
    const supabaseClient = createClient(supabaseUrl, supabaseServiceKey);
    
    // User client with anon key but passing the auth header
    const supabaseUser = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });
    
    // Validate the token using getClaims
    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabaseUser.auth.getClaims(token);
    
    if (claimsError || !claimsData?.claims) {
      console.error("Auth error:", claimsError);
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    
    const userId = claimsData.claims.sub;

    // Get user's profile and company
    const { data: profile, error: profileError } = await supabaseClient
      .from("profiles")
      .select("company_id, profile, id")
      .eq("user_id", userId)
      .single();

    if (profileError || !profile) {
      return new Response(JSON.stringify({ error: "Profile not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check if user has admin permissions
    if (!["admin", "super", "super_admin"].includes(profile.profile)) {
      return new Response(JSON.stringify({ error: "Insufficient permissions" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const { action, provider, config, api_key, model } = body;

    switch (action) {
      case "test": {
        let testApiKey = api_key;
        
        // If no API key provided, get from existing config
        if (!testApiKey) {
          const { data: existingConfig } = await supabaseClient
            .from("llm_configurations")
            .select("api_key_encrypted")
            .eq("company_id", profile.company_id)
            .eq("provider", provider)
            .single();

          if (existingConfig?.api_key_encrypted) {
            testApiKey = await decrypt(existingConfig.api_key_encrypted);
          }
        }

        if (!testApiKey) {
          return new Response(JSON.stringify({ success: false, error: "API Key não configurada" }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        let testResult;
        if (provider === "openai") {
          testResult = await testOpenAI(testApiKey, model || "gpt-4o-mini");
        } else if (provider === "gemini") {
          testResult = await testGemini(testApiKey, model || "gemini-2.0-flash");
        } else {
          return new Response(JSON.stringify({ success: false, error: "Provider não suportado" }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        // Update test status in database if testing existing config
        if (!api_key) {
          await supabaseClient
            .from("llm_configurations")
            .update({
              last_tested_at: new Date().toISOString(),
              last_test_status: testResult.success ? "success" : "error",
              last_test_error: testResult.error || null,
            })
            .eq("company_id", profile.company_id)
            .eq("provider", provider);
        }

        return new Response(JSON.stringify(testResult), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      case "create": {
        if (!config?.api_key) {
          return new Response(JSON.stringify({ success: false, error: "API Key é obrigatória" }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        const insertData: any = {
          company_id: profile.company_id,
          provider,
          default_model: config.default_model,
          api_base_url: config.api_base_url,
          request_timeout_seconds: config.request_timeout_seconds,
          max_retries: config.max_retries,
          advanced_settings: config.advanced_settings || {},
          is_active: true,
          api_key_encrypted: await encrypt(config.api_key),
          created_by: profile.id,
          updated_at: new Date().toISOString(),
        };

        if (config.organization_id) {
          insertData.organization_id = config.organization_id;
        }

        // Use upsert to keep create idempotent, but always include api_key_encrypted (NOT NULL)
        const { error: upsertError } = await supabaseClient
          .from("llm_configurations")
          .upsert(insertData, {
            onConflict: "company_id,provider",
          });

        if (upsertError) {
          console.error("Upsert error:", upsertError);
          return new Response(JSON.stringify({ success: false, error: upsertError.message }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        await supabaseClient.from("llm_config_audit_log").insert({
          company_id: profile.company_id,
          provider,
          action: "created",
          changed_by: profile.id,
          changes: { default_model: config.default_model },
        });

        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      case "update": {
        // IMPORTANT: do NOT use upsert here.
        // Postgres validates NOT NULL columns on the INSERT part of an upsert,
        // so omitting api_key_encrypted would fail even when row exists.

        const updateData: any = {
          default_model: config.default_model,
          api_base_url: config.api_base_url,
          request_timeout_seconds: config.request_timeout_seconds,
          max_retries: config.max_retries,
          advanced_settings: config.advanced_settings || {},
          is_active: true,
          updated_at: new Date().toISOString(),
        };

        if (config.api_key) {
          updateData.api_key_encrypted = await encrypt(config.api_key);
        }

        if (config.organization_id) {
          updateData.organization_id = config.organization_id;
        }

        const { data: updatedRow, error: updateError } = await supabaseClient
          .from("llm_configurations")
          .update(updateData)
          .eq("company_id", profile.company_id)
          .eq("provider", provider)
          .select("id")
          .maybeSingle();

        if (updateError) {
          console.error("Update error:", updateError);
          return new Response(JSON.stringify({ success: false, error: updateError.message }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        if (!updatedRow?.id) {
          return new Response(JSON.stringify({ success: false, error: "Configuração não encontrada para atualizar" }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        await supabaseClient.from("llm_config_audit_log").insert({
          company_id: profile.company_id,
          provider,
          action: "updated",
          changed_by: profile.id,
          changes: { default_model: config.default_model },
        });

        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      case "delete": {
        const { error: deleteError } = await supabaseClient
          .from("llm_configurations")
          .delete()
          .eq("company_id", profile.company_id)
          .eq("provider", provider);

        if (deleteError) {
          return new Response(JSON.stringify({ success: false, error: deleteError.message }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        // Log the action
        await supabaseClient.from("llm_config_audit_log").insert({
          company_id: profile.company_id,
          provider,
          action: "deleted",
          changed_by: profile.id,
        });

        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      case "get": {
        const { data: configs, error: getError } = await supabaseClient
          .from("llm_configurations")
          .select("*")
          .eq("company_id", profile.company_id);

        if (getError) {
          return new Response(JSON.stringify({ success: false, error: getError.message }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        // Mask API keys in response
        const maskedConfigs = (configs || []).map((c: any) => ({
          ...c,
          api_key_encrypted: undefined,
          api_key_masked: c.api_key_encrypted ? maskApiKey(c.api_key_encrypted) : undefined,
        }));

        return new Response(JSON.stringify({ success: true, configurations: maskedConfigs }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      default:
        return new Response(JSON.stringify({ error: "Invalid action" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    }
  } catch (error: any) {
    console.error("LLM Config Error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
