import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Smartphone, CheckCircle2, AlertCircle, ExternalLink } from "lucide-react";
import { toast } from "sonner";

interface MetaEmbeddedSignupProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  connectionId?: string;
  onSuccess: () => void;
}

interface WABAOption {
  wabaId: string;
  wabaName: string;
  businessId: string;
  businessName: string;
  phoneNumbers: Array<{
    id: string;
    display_phone_number: string;
    verified_name: string;
    quality_rating: string;
  }>;
}

// Session info captured from WA_EMBEDDED_SIGNUP message event
interface SessionInfo {
  waba_id: string;
  phone_number_id: string;
  business_id?: string;
}

declare global {
  interface Window {
    FB: any;
    fbAsyncInit: () => void;
  }
}

export function MetaEmbeddedSignup({ open, onOpenChange, connectionId, onSuccess }: MetaEmbeddedSignupProps) {
  const [step, setStep] = useState<'init' | 'loading' | 'select' | 'confirm' | 'complete'>('init');
  const [mode, setMode] = useState<'connect' | 'signup'>('connect');
  const [config, setConfig] = useState<{ appId: string; configId: string } | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [wabas, setWabas] = useState<WABAOption[]>([]);
  const [selectedWaba, setSelectedWaba] = useState<string>('');
  const [selectedPhone, setSelectedPhone] = useState<string>('');
  const [connectionName, setConnectionName] = useState('');
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Store session info from WA_EMBEDDED_SIGNUP message event
  const sessionInfoRef = useRef<SessionInfo | null>(null);

  // Load Meta config on mount
  useEffect(() => {
    if (open) {
      loadConfig();
    }
  }, [open]);

  // Load Facebook SDK
  useEffect(() => {
    if (config?.appId && !window.FB) {
      loadFacebookSDK(config.appId);
    }
  }, [config?.appId]);

  // Set up WA_EMBEDDED_SIGNUP message listener
  // This is CRITICAL - Meta sends waba_id and phone_number_id via this event, NOT in FB.login callback
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      // Only accept messages from Facebook
      if (!event.origin.endsWith('facebook.com')) return;

      try {
        const data = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;
        
        if (data.type === 'WA_EMBEDDED_SIGNUP') {
          console.log('[Meta Embedded Signup] WA_EMBEDDED_SIGNUP event received:', data);
          
          if (data.event === 'FINISH' || data.event === 'FINISH_WHATSAPP_BUSINESS_APP_ONBOARDING') {
            // Success - capture the session info
            const sessionData = data.data;
            if (sessionData?.waba_id && sessionData?.phone_number_id) {
              console.log('[Meta Embedded Signup] Session info captured:', {
                waba_id: sessionData.waba_id,
                phone_number_id: sessionData.phone_number_id,
                business_id: sessionData.business_id,
              });
              sessionInfoRef.current = {
                waba_id: sessionData.waba_id,
                phone_number_id: sessionData.phone_number_id,
                business_id: sessionData.business_id,
              };
            }
          } else if (data.event === 'CANCEL') {
            // User cancelled the flow
            console.log('[Meta Embedded Signup] User cancelled at step:', data.data?.current_step);
          } else if (data.event === 'FINISH_ONLY_WABA') {
            // Completed flow but without adding a phone number
            console.log('[Meta Embedded Signup] Completed without phone number');
            if (data.data?.waba_id) {
              sessionInfoRef.current = {
                waba_id: data.data.waba_id,
                phone_number_id: '', // No phone number
                business_id: data.data.business_id,
              };
            }
          }
        }
      } catch (e) {
        // Not a JSON message or not relevant, ignore
        console.log('[Meta Embedded Signup] Non-JSON message event:', event.data);
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  const loadConfig = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('meta-embedded-signup', {
        body: { action: 'get_config' },
      });

      if (error) throw error;

      if (data?.success === false) {
        throw new Error(data.error || 'Configuração da Meta inválida');
      }
      
      if (data?.success && data.config) {
        setConfig(data.config);
      } else {
        throw new Error('Failed to load Meta configuration');
      }
    } catch (err) {
      console.error('Error loading config:', err);
      setError('Erro ao carregar configuração da Meta. Configure o App ID nas configurações.');
    }
  };

  const loadFacebookSDK = (appId: string) => {
    window.fbAsyncInit = function() {
      window.FB.init({
        appId: appId,
        autoLogAppEvents: true,
        xfbml: true,
        version: 'v21.0'
      });
      console.log('[Meta Embedded Signup] Facebook SDK initialized');
    };

    // Load the SDK
    (function(d, s, id) {
      const fjs = d.getElementsByTagName(s)[0];
      if (d.getElementById(id)) return;
      const js = d.createElement(s) as HTMLScriptElement;
      js.id = id;
      js.src = 'https://connect.facebook.net/pt_BR/sdk.js';
      fjs.parentNode?.insertBefore(js, fjs);
    }(document, 'script', 'facebook-jssdk'));
  };

  const startEmbeddedSignup = useCallback((mode: 'connect' | 'signup' = 'connect') => {
    if (!window.FB) {
      toast.error('Facebook SDK não carregado. Aguarde...');
      return;
    }

    if (!config?.configId) {
      toast.error('Config ID da Meta não configurado');
      return;
    }

    // Clear previous session info before starting new flow
    sessionInfoRef.current = null;

    setStep('loading');
    setError(null);

    // Both modes use config_id, but with different featureType
    // 'coexistence' = connect existing WhatsApp Business App number
    // '' (empty) = create new account via Embedded Signup
    const featureType = mode === 'connect' ? 'coexistence' : '';

    window.FB.login(
      function(response: any) {
        if (response.authResponse) {
          console.log(`[Meta Embedded Signup] FB.login callback received (${mode} mode)`);
          // The waba_id and phone_number_id come from WA_EMBEDDED_SIGNUP message event,
          // NOT from this callback. This callback only gives us the code for token exchange.
          handleLoginResponse(response);
        } else {
          console.log('[Meta Embedded Signup] Login cancelled');
          setStep('init');
          setError('Login cancelado pelo usuário');
        }
      },
      {
        config_id: config.configId,
        response_type: 'code',
        override_default_response_type: true,
        extras: {
          setup: {},
          featureType: featureType,
          sessionInfoVersion: '2',
        }
      }
    );
  }, [config]);


  // Wait for session info with retries (WA_EMBEDDED_SIGNUP event may arrive slightly after FB.login callback)
  const waitForSessionInfo = async (maxRetries = 10, delayMs = 300): Promise<SessionInfo | null> => {
    for (let i = 0; i < maxRetries; i++) {
      if (sessionInfoRef.current?.waba_id && sessionInfoRef.current?.phone_number_id) {
        return sessionInfoRef.current;
      }
      console.log(`[Meta Embedded Signup] Waiting for session info... attempt ${i + 1}/${maxRetries}`);
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }
    return sessionInfoRef.current;
  };

  const handleLoginResponse = async (loginResponse: any) => {
    try {
      const authResponse = loginResponse?.authResponse ?? loginResponse;
      const code = authResponse?.code;

      if (!code) {
        throw new Error('No authorization code received');
      }

      console.log('[Meta Embedded Signup] Processing authorization code...');

      // Exchange code for token
      const { data: tokenData, error: tokenError } = await supabase.functions.invoke('meta-embedded-signup', {
        body: { 
          action: 'exchange_token',
          code,
        },
      });

      if (tokenError) throw tokenError;

      if (tokenData?.success === false) {
        throw new Error(tokenData.error || 'Falha ao trocar token');
      }
      
      if (!tokenData?.success || !tokenData.accessToken) {
        throw new Error(tokenData?.error || 'Token exchange failed');
      }

      setAccessToken(tokenData.accessToken);

      // Wait for session info from WA_EMBEDDED_SIGNUP message event (with retries for timing issues)
      console.log('[Meta Embedded Signup] Waiting for WA_EMBEDDED_SIGNUP event data...');
      const sessionInfo = await waitForSessionInfo();

      if (sessionInfo?.waba_id && sessionInfo?.phone_number_id) {
        // SUCCESS! We have direct session info from Embedded Signup
        console.log('[Meta Embedded Signup] Using session info from WA_EMBEDDED_SIGNUP event:', sessionInfo);
        
        // Get phone number details from Graph API
        const { data: phoneData, error: phoneError } = await supabase.functions.invoke('meta-embedded-signup', {
          body: {
            action: 'get_phone_details',
            accessToken: tokenData.accessToken,
            wabaId: sessionInfo.waba_id,
            phoneNumberId: sessionInfo.phone_number_id,
          },
        });

        if (phoneError) throw phoneError;

        if (phoneData?.success === false) {
          throw new Error(phoneData.error || 'Falha ao carregar detalhes do número');
        }

        // Create a synthetic WABA option with the session data
        const sessionWaba: WABAOption = {
          wabaId: sessionInfo.waba_id,
          wabaName: phoneData?.wabaName || 'WhatsApp Business',
          businessId: phoneData?.businessId || sessionInfo.business_id || '',
          businessName: phoneData?.businessName || '',
          phoneNumbers: [{
            id: sessionInfo.phone_number_id,
            display_phone_number: phoneData?.displayPhoneNumber || '',
            verified_name: phoneData?.verifiedName || '',
            quality_rating: phoneData?.qualityRating || 'GREEN',
          }],
        };

        setWabas([sessionWaba]);
        setSelectedWaba(sessionInfo.waba_id);
        setSelectedPhone(sessionInfo.phone_number_id);
        setConnectionName(phoneData?.verifiedName || '');
        setStep('select');
        return;
      }

      // If no session info, user might have cancelled before completing
      // or there's a timing issue. Show a helpful error.
      console.warn('[Meta Embedded Signup] No session info received from WA_EMBEDDED_SIGNUP event');
      
      // Try the fallback method (for backwards compatibility or edge cases)
      // This uses /me/businesses which requires more permissions
      const { data: wabaData, error: wabaError } = await supabase.functions.invoke('meta-embedded-signup', {
        body: {
          action: 'get_waba_info',
          accessToken: tokenData.accessToken,
        },
      });

      if (wabaError) throw wabaError;

      if (wabaData?.success === false) {
        // Permission error - explain to user what happened
        if (wabaData.error?.includes('Missing Permission') || wabaData.error?.includes('permission')) {
          throw new Error(
            'Não foi possível capturar os dados da conta. Por favor, complete todo o fluxo de autorização da Meta. ' +
            'Se o problema persistir, verifique se você tem permissão de administrador na conta WhatsApp Business.'
          );
        }
        throw new Error(wabaData.error || 'Falha ao carregar contas WhatsApp Business');
      }

      if (wabaData?.wabas && wabaData.wabas.length > 0) {
        setWabas(wabaData.wabas);
        
        // Auto-select if only one option
        if (wabaData.wabas.length === 1 && wabaData.wabas[0].phoneNumbers.length === 1) {
          setSelectedWaba(wabaData.wabas[0].wabaId);
          setSelectedPhone(wabaData.wabas[0].phoneNumbers[0].id);
          setConnectionName(wabaData.wabas[0].phoneNumbers[0].verified_name || '');
        }
        
        setStep('select');
      } else {
        throw new Error(
          'Nenhuma conta WhatsApp Business encontrada. ' +
          'Complete todo o fluxo de autorização da Meta, incluindo a seleção do número de telefone.'
        );
      }
    } catch (err) {
      console.error('[Meta Embedded Signup] Error:', err);
      setError(err instanceof Error ? err.message : 'Erro ao processar login');
      setStep('init');
    }
  };

  const completeSignup = async () => {
    if (!accessToken || !selectedWaba || !selectedPhone) {
      toast.error('Selecione uma conta e número de telefone');
      return;
    }

    setProcessing(true);

    try {
      const { data, error } = await supabase.functions.invoke('meta-embedded-signup', {
        body: {
          action: 'complete_signup',
          accessToken,
          wabaId: selectedWaba,
          phoneNumberId: selectedPhone,
          connectionId,
          connectionName: connectionName || undefined,
        },
      });

      if (error) throw error;

      if (data?.success) {
        setStep('complete');
        toast.success('WhatsApp conectado com sucesso!');
        
        setTimeout(() => {
          onOpenChange(false);
          onSuccess();
        }, 2000);
      } else {
        throw new Error(data?.error || 'Erro ao completar cadastro');
      }
    } catch (err) {
      console.error('[Meta Embedded Signup] Complete error:', err);
      toast.error(err instanceof Error ? err.message : 'Erro ao conectar WhatsApp');
    } finally {
      setProcessing(false);
    }
  };

  const getSelectedWabaPhones = () => {
    const waba = wabas.find(w => w.wabaId === selectedWaba);
    return waba?.phoneNumbers || [];
  };

  const handleClose = () => {
    setStep('init');
    setAccessToken(null);
    setWabas([]);
    setSelectedWaba('');
    setSelectedPhone('');
    setConnectionName('');
    setError(null);
    sessionInfoRef.current = null;
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Smartphone className="h-5 w-5" />
            Conectar WhatsApp API Oficial
          </DialogTitle>
          <DialogDescription>
            Conecte seu número do WhatsApp Business usando a API oficial da Meta
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {step === 'init' && (
            <div className="space-y-4">
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Escolha como deseja conectar seu WhatsApp Business.
                </AlertDescription>
              </Alert>

              {/* Mode Selection */}
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setMode('connect')}
                  className={`p-4 rounded-lg border-2 text-left transition-all ${
                    mode === 'connect' 
                      ? 'border-primary bg-primary/5' 
                      : 'border-border hover:border-muted-foreground'
                  }`}
                >
                  <p className="font-medium text-sm">Conectar Existente</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Já tenho uma conta WhatsApp Business configurada
                  </p>
                </button>
                <button
                  type="button"
                  onClick={() => setMode('signup')}
                  className={`p-4 rounded-lg border-2 text-left transition-all ${
                    mode === 'signup' 
                      ? 'border-primary bg-primary/5' 
                      : 'border-border hover:border-muted-foreground'
                  }`}
                >
                  <p className="font-medium text-sm">Criar Nova Conta</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Criar uma nova conta WhatsApp Business
                  </p>
                </button>
              </div>

              <div className="bg-muted p-4 rounded-lg space-y-2 text-sm">
                <p className="font-medium">
                  {mode === 'connect' ? 'Requisitos para conectar:' : 'Requisitos para criar:'}
                </p>
                <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                  {mode === 'connect' ? (
                    <>
                      <li>Conta no Facebook Business Manager</li>
                      <li>WhatsApp Business Account (WABA) existente</li>
                      <li>Número de telefone já configurado</li>
                    </>
                  ) : (
                    <>
                      <li>Conta no Facebook</li>
                      <li>Número de telefone não usado em WhatsApp</li>
                      <li>Acesso ao telefone para verificação</li>
                    </>
                  )}
                </ul>
              </div>
            </div>
          )}

          {step === 'loading' && (
            <div className="flex flex-col items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
              <p className="text-muted-foreground">Processando autorização...</p>
            </div>
          )}

          {step === 'select' && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Conta WhatsApp Business</Label>
                <Select value={selectedWaba} onValueChange={(v) => {
                  setSelectedWaba(v);
                  setSelectedPhone('');
                }}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione a conta" />
                  </SelectTrigger>
                  <SelectContent>
                    {wabas.map((waba) => (
                      <SelectItem key={waba.wabaId} value={waba.wabaId}>
                        {waba.wabaName} ({waba.businessName})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {selectedWaba && (
                <div className="space-y-2">
                  <Label>Número de Telefone</Label>
                  <Select value={selectedPhone} onValueChange={setSelectedPhone}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o número" />
                    </SelectTrigger>
                    <SelectContent>
                      {getSelectedWabaPhones().map((phone) => (
                        <SelectItem key={phone.id} value={phone.id}>
                          {phone.display_phone_number} - {phone.verified_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {selectedPhone && (
                <div className="space-y-2">
                  <Label>Nome da Conexão (opcional)</Label>
                  <Input
                    placeholder="Ex: WhatsApp Principal"
                    value={connectionName}
                    onChange={(e) => setConnectionName(e.target.value)}
                  />
                </div>
              )}
            </div>
          )}

          {step === 'complete' && (
            <div className="flex flex-col items-center justify-center py-8">
              <CheckCircle2 className="h-12 w-12 text-primary mb-4" />
              <p className="text-lg font-medium">WhatsApp Conectado!</p>
              <p className="text-muted-foreground text-sm">
                Seu número foi configurado com sucesso
              </p>
            </div>
          )}
        </div>

        <DialogFooter>
          {step === 'init' && (
            <>
              <Button variant="outline" onClick={handleClose}>
                Cancelar
              </Button>
              <Button onClick={() => startEmbeddedSignup(mode)} disabled={!config}>
                <ExternalLink className="h-4 w-4 mr-2" />
                {mode === 'connect' ? 'Conectar Conta Existente' : 'Criar Nova Conta'}
              </Button>
            </>
          )}

          {step === 'select' && (
            <>
              <Button variant="outline" onClick={handleClose}>
                Cancelar
              </Button>
              <Button 
                onClick={completeSignup} 
                disabled={!selectedWaba || !selectedPhone || processing}
              >
                {processing ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Conectando...
                  </>
                ) : (
                  'Confirmar Conexão'
                )}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
