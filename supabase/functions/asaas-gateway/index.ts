import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface AsaasCustomer {
  name: string;
  email?: string;
  cpfCnpj: string;
  phone?: string;
  externalReference?: string;
}

interface AsaasPayment {
  customer: string;
  billingType: 'BOLETO' | 'PIX' | 'CREDIT_CARD';
  value: number;
  dueDate: string;
  description?: string;
  externalReference?: string;
  installmentCount?: number;
  installmentValue?: number;
  split?: AsaasSplit[];
}

interface AsaasSplit {
  walletId: string;
  fixedValue?: number;
  percentualValue?: number;
}

interface AsaasSubaccount {
  name: string;
  email: string;
  cpfCnpj: string;
  phone?: string;
  mobilePhone?: string;
  address: string;
  addressNumber: string;
  complement?: string;
  province: string;
  postalCode: string;
  city?: number;
  birthDate?: string;
  companyType?: string;
  loginEmail?: string;
}

interface PaymentResult {
  id: string;
  invoiceUrl?: string;
  bankSlipUrl?: string;
  pixQrCode?: string;
  pixCopyPaste?: string;
  status: string;
}

// Get the Asaas API base URL based on environment
function getAsaasBaseUrl(environment: string): string {
  return environment === 'production'
    ? 'https://api.asaas.com/v3'
    : 'https://sandbox.asaas.com/api/v3';
}

// Get platform configuration
async function getPlatformConfig(supabase: any) {
  const { data, error } = await supabase
    .from('asaas_platform_config')
    .select('*')
    .limit(1)
    .maybeSingle();

  if (error) throw new Error(`Error fetching platform config: ${error.message}`);
  return data;
}

// Get company configuration
async function getCompanyConfig(supabase: any, companyId: string) {
  const { data, error } = await supabase
    .from('asaas_company_config')
    .select('*')
    .eq('company_id', companyId)
    .maybeSingle();

  if (error) throw new Error(`Error fetching company config: ${error.message}`);
  return data;
}

// Make Asaas API request
async function asaasRequest(
  baseUrl: string,
  apiKey: string,
  endpoint: string,
  method: string = 'GET',
  body?: any
) {
  const response = await fetch(`${baseUrl}${endpoint}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      'access_token': apiKey,
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  const data = await response.json();

  if (!response.ok) {
    console.error('Asaas API Error:', data);
    throw new Error(data.errors?.[0]?.description || 'Asaas API error');
  }

  return data;
}

// Create or get customer
async function getOrCreateCustomer(
  supabase: any,
  baseUrl: string,
  apiKey: string,
  companyId: string,
  customerData: AsaasCustomer
): Promise<string> {
  // Check if customer exists in our database
  const { data: existingCustomer } = await supabase
    .from('asaas_customers')
    .select('asaas_customer_id')
    .eq('company_id', companyId)
    .eq('cpf_cnpj', customerData.cpfCnpj)
    .maybeSingle();

  if (existingCustomer) {
    return existingCustomer.asaas_customer_id;
  }

  // Check if customer exists in Asaas
  const searchResult = await asaasRequest(
    baseUrl,
    apiKey,
    `/customers?cpfCnpj=${customerData.cpfCnpj}`
  );

  if (searchResult.data?.length > 0) {
    const asaasCustomerId = searchResult.data[0].id;

    // Save to our database
    await supabase.from('asaas_customers').insert({
      company_id: companyId,
      asaas_customer_id: asaasCustomerId,
      name: customerData.name,
      email: customerData.email,
      cpf_cnpj: customerData.cpfCnpj,
      phone: customerData.phone,
    });

    return asaasCustomerId;
  }

  // Create new customer in Asaas
  const newCustomer = await asaasRequest(
    baseUrl,
    apiKey,
    '/customers',
    'POST',
    customerData
  );

  // Save to our database
  await supabase.from('asaas_customers').insert({
    company_id: companyId,
    asaas_customer_id: newCustomer.id,
    name: customerData.name,
    email: customerData.email,
    cpf_cnpj: customerData.cpfCnpj,
    phone: customerData.phone,
  });

  return newCustomer.id;
}

// Create payment with split
async function createPayment(
  supabase: any,
  baseUrl: string,
  apiKey: string,
  companyId: string,
  companyConfig: any,
  platformConfig: any,
  paymentData: AsaasPayment
): Promise<PaymentResult> {
  // Add split if platform has fee and company has wallet
  if (platformConfig?.platform_fee_value > 0 && platformConfig?.platform_wallet_id) {
    paymentData.split = [{
      walletId: platformConfig.platform_wallet_id,
      fixedValue: platformConfig.platform_fee_type === 'fixed' 
        ? Number(platformConfig.platform_fee_value) 
        : undefined,
      percentualValue: platformConfig.platform_fee_type === 'percentage' 
        ? Number(platformConfig.platform_fee_value) 
        : undefined,
    }];
  }

  const payment = await asaasRequest(baseUrl, apiKey, '/payments', 'POST', paymentData);

  // Get additional payment info based on billing type
  const result: PaymentResult = {
    id: payment.id,
    invoiceUrl: payment.invoiceUrl,
    bankSlipUrl: payment.bankSlipUrl,
    status: payment.status,
  };

  // Get PIX QR code if payment type is PIX
  if (paymentData.billingType === 'PIX') {
    try {
      const pixInfo = await asaasRequest(baseUrl, apiKey, `/payments/${payment.id}/pixQrCode`);
      result.pixQrCode = pixInfo.encodedImage;
      result.pixCopyPaste = pixInfo.payload;
    } catch (e) {
      console.error('Error getting PIX QR code:', e);
    }
  }

  return result;
}

// Create Asaas subaccount for company
async function createSubaccount(
  baseUrl: string,
  apiKey: string,
  subaccountData: AsaasSubaccount
): Promise<{ id: string; walletId: string; apiKey: string }> {
  const result = await asaasRequest(baseUrl, apiKey, '/accounts', 'POST', subaccountData);
  
  return {
    id: result.id,
    walletId: result.walletId,
    apiKey: result.apiKey,
  };
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { action, ...params } = await req.json();

    // Get platform configuration
    const platformConfig = await getPlatformConfig(supabase);
    
    if (!platformConfig && action !== 'test_connection' && action !== 'get_config') {
      return new Response(
        JSON.stringify({ error: 'Asaas not configured' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const environment = platformConfig?.environment || 'sandbox';
    const apiKey = environment === 'production' 
      ? platformConfig?.api_key_production 
      : platformConfig?.api_key_sandbox;
    const baseUrl = getAsaasBaseUrl(environment);

    switch (action) {
      case 'test_connection': {
        if (!apiKey) {
          return new Response(
            JSON.stringify({ success: false, error: 'API key not configured' }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        try {
          await asaasRequest(baseUrl, apiKey, '/customers?limit=1');
          return new Response(
            JSON.stringify({ success: true }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        } catch (e) {
          const errorMessage = e instanceof Error ? e.message : 'Unknown error';
          return new Response(
            JSON.stringify({ success: false, error: errorMessage }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
      }

      case 'get_config': {
        return new Response(
          JSON.stringify({
            configured: !!platformConfig,
            environment: platformConfig?.environment || 'sandbox',
            isActive: platformConfig?.is_active || false,
            platformFeeType: platformConfig?.platform_fee_type || 'fixed',
            platformFeeValue: platformConfig?.platform_fee_value || 0,
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'create_customer': {
        const { companyId, customer } = params;
        
        // Get company config to use their API key if available
        const companyConfig = await getCompanyConfig(supabase, companyId);
        const effectiveApiKey = companyConfig?.api_key || apiKey;

        const customerId = await getOrCreateCustomer(
          supabase,
          baseUrl,
          effectiveApiKey,
          companyId,
          customer
        );

        return new Response(
          JSON.stringify({ success: true, customerId }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'create_subaccount': {
        const { companyId, subaccount } = params;

        if (!apiKey) {
          return new Response(
            JSON.stringify({ error: 'Platform API key not configured' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        try {
          // Create subaccount in Asaas
          const result = await createSubaccount(baseUrl, apiKey, subaccount);

          // Update company config with subaccount details
          const { error: updateError } = await supabase
            .from('asaas_company_config')
            .upsert({
              company_id: companyId,
              wallet_id: result.walletId,
              api_key: result.apiKey,
              is_subaccount: true,
              subaccount_id: result.id,
              is_active: true,
              updated_at: new Date().toISOString(),
            }, { onConflict: 'company_id' });

          if (updateError) {
            console.error('Error saving subaccount config:', updateError);
          }

          return new Response(
            JSON.stringify({ 
              success: true, 
              subaccount: {
                id: result.id,
                walletId: result.walletId,
              }
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        } catch (e) {
          const errorMessage = e instanceof Error ? e.message : 'Unknown error';
          return new Response(
            JSON.stringify({ success: false, error: errorMessage }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
      }

      case 'create_payment': {
        const { companyId, payment, memberId, contractId, memberPaymentId, customerData } = params;

        // Get company config
        const companyConfig = await getCompanyConfig(supabase, companyId);
        const effectiveApiKey = companyConfig?.api_key || apiKey;

        // Get or create customer
        const customerId = await getOrCreateCustomer(
          supabase,
          baseUrl,
          effectiveApiKey,
          companyId,
          customerData
        );

        // Create payment with split
        const paymentResult = await createPayment(
          supabase,
          baseUrl,
          effectiveApiKey,
          companyId,
          companyConfig,
          platformConfig,
          {
            ...payment,
            customer: customerId,
          }
        );

        // Save payment to our database
        const { error: saveError } = await supabase.from('asaas_payments').insert({
          company_id: companyId,
          member_id: memberId,
          contract_id: contractId,
          member_payment_id: memberPaymentId,
          asaas_payment_id: paymentResult.id,
          asaas_customer_id: customerId,
          billing_type: payment.billingType,
          value: payment.value,
          platform_fee: platformConfig?.platform_fee_value || 0,
          status: paymentResult.status,
          due_date: payment.dueDate,
          invoice_url: paymentResult.invoiceUrl,
          bank_slip_url: paymentResult.bankSlipUrl,
          pix_qr_code: paymentResult.pixQrCode,
          pix_copy_paste: paymentResult.pixCopyPaste,
          description: payment.description,
          external_reference: payment.externalReference,
          customer_name: customerData.name,
          customer_email: customerData.email,
          customer_cpf_cnpj: customerData.cpfCnpj,
        });

        if (saveError) {
          console.error('Error saving payment:', saveError);
        }

        return new Response(
          JSON.stringify({
            success: true,
            payment: paymentResult,
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'get_payment': {
        const { paymentId } = params;

        const payment = await asaasRequest(baseUrl, apiKey, `/payments/${paymentId}`);

        return new Response(
          JSON.stringify({ success: true, payment }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'list_payments': {
        const { companyId, status, offset = 0, limit = 20 } = params;

        let query = supabase
          .from('asaas_payments')
          .select('*')
          .eq('company_id', companyId)
          .order('created_at', { ascending: false })
          .range(offset, offset + limit - 1);

        if (status) {
          query = query.eq('status', status);
        }

        const { data, error } = await query;

        if (error) throw error;

        return new Response(
          JSON.stringify({ success: true, payments: data }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      default:
        return new Response(
          JSON.stringify({ error: 'Unknown action' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }
  } catch (error) {
    console.error('Asaas Gateway Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
