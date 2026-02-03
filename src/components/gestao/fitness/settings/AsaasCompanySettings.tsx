import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, CreditCard, CheckCircle2, XCircle, Building2, UserPlus } from "lucide-react";
import { toast } from "sonner";

interface CompanyAsaasConfig {
  id?: string;
  wallet_id: string;
  api_key: string;
  is_subaccount: boolean;
  subaccount_id: string;
  is_active: boolean;
}

interface CompanyData {
  name: string;
  email: string;
  phone: string;
  document: string;
  address_street: string;
  address_number: string;
  address_complement: string;
  address_neighborhood: string;
  address_city: string;
  address_state: string;
  address_zipcode: string;
  birth_date: string;
  company_type: string;
}

const defaultConfig: CompanyAsaasConfig = {
  wallet_id: '',
  api_key: '',
  is_subaccount: false,
  subaccount_id: '',
  is_active: true,
};

const defaultCompanyData: CompanyData = {
  name: '',
  email: '',
  phone: '',
  document: '',
  address_street: '',
  address_number: '',
  address_complement: '',
  address_neighborhood: '',
  address_city: '',
  address_state: '',
  address_zipcode: '',
  birth_date: '',
  company_type: 'MEI',
};

const COMPANY_TYPES = [
  { value: 'MEI', label: 'MEI - Microempreendedor Individual' },
  { value: 'LIMITED', label: 'Ltda - Sociedade Limitada' },
  { value: 'INDIVIDUAL', label: 'EI - Empresário Individual' },
  { value: 'ASSOCIATION', label: 'Associação' },
];

const BRAZILIAN_STATES = [
  'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 
  'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 
  'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO'
];

export function AsaasCompanySettings() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [creatingSubaccount, setCreatingSubaccount] = useState(false);
  const [platformConfigured, setPlatformConfigured] = useState(false);
  const [companyId, setCompanyId] = useState<string | null>(null);
  
  const [config, setConfig] = useState<CompanyAsaasConfig>(defaultConfig);
  const [companyData, setCompanyData] = useState<CompanyData>(defaultCompanyData);

  useEffect(() => {
    loadCompanyId();
  }, [user?.id]);

  const loadCompanyId = async () => {
    if (!user?.id) return;
    const { data } = await supabase
      .from('profiles')
      .select('company_id')
      .eq('user_id', user.id)
      .maybeSingle();
    if (data?.company_id) {
      setCompanyId(data.company_id);
    }
  };

  useEffect(() => {
    if (companyId) {
      loadConfig();
      loadCompanyData();
      checkPlatformConfig();
    }
  }, [companyId]);

  const checkPlatformConfig = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('asaas-gateway', {
        body: { action: 'get_config' },
      });

      if (!error && data?.configured && data?.isActive) {
        setPlatformConfigured(true);
      }
    } catch (error) {
      console.error("Error checking platform config:", error);
    }
  };

  const loadConfig = async () => {
    if (!companyId) return;
    
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from("asaas_company_config")
        .select("*")
        .eq("company_id", companyId)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setConfig({
          id: data.id,
          wallet_id: data.wallet_id || '',
          api_key: data.api_key || '',
          is_subaccount: data.is_subaccount ?? false,
          subaccount_id: data.subaccount_id || '',
          is_active: data.is_active ?? true,
        });
      }
    } catch (error) {
      console.error("Error loading config:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadCompanyData = async () => {
    if (!companyId) return;

    try {
      const { data, error } = await supabase
        .from("companies")
        .select("*")
        .eq("id", companyId)
        .single();

      if (error) throw error;

      if (data) {
        setCompanyData({
          name: data.name || '',
          email: data.email || '',
          phone: data.phone || '',
          document: data.document || '',
          address_street: data.address_street || '',
          address_number: data.address_number || '',
          address_complement: data.address_complement || '',
          address_neighborhood: data.address_neighborhood || '',
          address_city: data.address_city || '',
          address_state: data.address_state || '',
          address_zipcode: data.address_zipcode || '',
          birth_date: data.birth_date || '',
          company_type: data.company_type || 'MEI',
        });
      }
    } catch (error) {
      console.error("Error loading company data:", error);
    }
  };

  const saveConfig = async () => {
    if (!companyId) return;

    try {
      setSaving(true);

      const { error } = await supabase
        .from("asaas_company_config")
        .update({
          is_active: config.is_active,
          updated_at: new Date().toISOString(),
        })
        .eq("id", config.id);

      if (error) throw error;

      toast.success("Configurações salvas!");
    } catch (error) {
      console.error("Error saving config:", error);
      toast.error("Erro ao salvar configurações");
    } finally {
      setSaving(false);
    }
  };

  const saveCompanyData = async () => {
    if (!companyId) return;

    try {
      const { error } = await supabase
        .from("companies")
        .update({
          address_street: companyData.address_street,
          address_number: companyData.address_number,
          address_complement: companyData.address_complement,
          address_neighborhood: companyData.address_neighborhood,
          address_city: companyData.address_city,
          address_state: companyData.address_state,
          address_zipcode: companyData.address_zipcode,
          birth_date: companyData.birth_date || null,
          company_type: companyData.company_type,
          updated_at: new Date().toISOString(),
        })
        .eq("id", companyId);

      if (error) throw error;
    } catch (error) {
      console.error("Error saving company data:", error);
      throw error;
    }
  };

  const createSubaccount = async () => {
    if (!companyId) return;

    const requiredFields = [
      { field: 'name', label: 'Nome/Razão Social' },
      { field: 'email', label: 'Email' },
      { field: 'document', label: 'CPF/CNPJ' },
      { field: 'address_street', label: 'Logradouro' },
      { field: 'address_number', label: 'Número' },
      { field: 'address_neighborhood', label: 'Bairro' },
      { field: 'address_zipcode', label: 'CEP' },
    ];

    for (const { field, label } of requiredFields) {
      if (!companyData[field as keyof CompanyData]) {
        toast.error(`Campo obrigatório: ${label}`);
        return;
      }
    }

    try {
      setCreatingSubaccount(true);

      await saveCompanyData();

      const formattedPhone = companyData.phone?.replace(/\D/g, '') || '';
      const formattedZipcode = companyData.address_zipcode?.replace(/\D/g, '') || '';

      const { data, error } = await supabase.functions.invoke('asaas-gateway', {
        body: {
          action: 'create_subaccount',
          companyId,
          subaccount: {
            name: companyData.name,
            email: companyData.email,
            loginEmail: companyData.email,
            cpfCnpj: companyData.document.replace(/\D/g, ''),
            phone: formattedPhone,
            mobilePhone: formattedPhone,
            address: companyData.address_street,
            addressNumber: companyData.address_number,
            complement: companyData.address_complement || undefined,
            province: companyData.address_neighborhood,
            postalCode: formattedZipcode,
            birthDate: companyData.birth_date || undefined,
            companyType: companyData.company_type,
          },
        },
      });

      if (error) throw error;

      if (data?.success) {
        toast.success("Subconta criada com sucesso!");
        await loadConfig();
      } else {
        throw new Error(data?.error || "Erro ao criar subconta");
      }
    } catch (error: any) {
      console.error("Error creating subaccount:", error);
      toast.error(error.message || "Erro ao criar subconta no Asaas");
    } finally {
      setCreatingSubaccount(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!platformConfigured) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Conta de Recebimento
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive">
            <XCircle className="h-4 w-4" />
            <AlertDescription>
              A integração de pagamentos ainda não foi configurada pela plataforma. 
              Entre em contato com o suporte para mais informações.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  // Subconta já criada - mostrar status
  if (config.is_subaccount && config.wallet_id) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                Conta de Recebimento
              </CardTitle>
              <CardDescription>
                Sua conta está configurada para receber pagamentos
              </CardDescription>
            </div>
            <Badge variant="default" className="flex items-center gap-1">
              <CheckCircle2 className="h-3 w-3" /> Ativa
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="p-4 bg-muted/50 rounded-lg space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">ID da Conta</span>
              <span className="text-sm font-mono">{config.subaccount_id}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Wallet ID</span>
              <span className="text-sm font-mono">{config.wallet_id}</span>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Recebimentos Ativos</Label>
              <p className="text-sm text-muted-foreground">
                Pausar temporariamente os recebimentos
              </p>
            </div>
            <Switch
              checked={config.is_active}
              onCheckedChange={(checked) => setConfig(prev => ({ ...prev, is_active: checked }))}
            />
          </div>

          <div className="flex justify-end">
            <Button onClick={saveConfig} disabled={saving}>
              {saving ? (
                <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Salvando...</>
              ) : (
                'Salvar'
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Formulário de criação de subconta
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CreditCard className="h-5 w-5" />
          Conta de Recebimento
        </CardTitle>
        <CardDescription>
          Configure sua conta para receber pagamentos dos clientes
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <Alert>
          <Building2 className="h-4 w-4" />
          <AlertDescription>
            Preencha os dados abaixo para criar sua conta de recebimento. 
            Após a criação, você poderá receber pagamentos automaticamente.
          </AlertDescription>
        </Alert>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Nome/Razão Social *</Label>
            <Input
              value={companyData.name}
              onChange={(e) => setCompanyData(prev => ({ ...prev, name: e.target.value }))}
              placeholder="Nome da empresa"
            />
          </div>

          <div className="space-y-2">
            <Label>CPF/CNPJ *</Label>
            <Input
              value={companyData.document}
              onChange={(e) => setCompanyData(prev => ({ ...prev, document: e.target.value }))}
              placeholder="00.000.000/0000-00"
            />
          </div>

          <div className="space-y-2">
            <Label>Email *</Label>
            <Input
              type="email"
              value={companyData.email}
              onChange={(e) => setCompanyData(prev => ({ ...prev, email: e.target.value }))}
              placeholder="email@empresa.com"
            />
          </div>

          <div className="space-y-2">
            <Label>Telefone</Label>
            <Input
              value={companyData.phone}
              onChange={(e) => setCompanyData(prev => ({ ...prev, phone: e.target.value }))}
              placeholder="(00) 00000-0000"
            />
          </div>

          <div className="space-y-2">
            <Label>Tipo de Empresa</Label>
            <Select
              value={companyData.company_type}
              onValueChange={(value) => setCompanyData(prev => ({ ...prev, company_type: value }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {COMPANY_TYPES.map(type => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Data de Nascimento (PF)</Label>
            <Input
              type="date"
              value={companyData.birth_date}
              onChange={(e) => setCompanyData(prev => ({ ...prev, birth_date: e.target.value }))}
            />
          </div>
        </div>

        <div className="space-y-4">
          <h4 className="font-medium">Endereço</h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2 md:col-span-2">
              <Label>Logradouro *</Label>
              <Input
                value={companyData.address_street}
                onChange={(e) => setCompanyData(prev => ({ ...prev, address_street: e.target.value }))}
                placeholder="Rua, Avenida..."
              />
            </div>

            <div className="space-y-2">
              <Label>Número *</Label>
              <Input
                value={companyData.address_number}
                onChange={(e) => setCompanyData(prev => ({ ...prev, address_number: e.target.value }))}
                placeholder="123"
              />
            </div>

            <div className="space-y-2">
              <Label>Complemento</Label>
              <Input
                value={companyData.address_complement}
                onChange={(e) => setCompanyData(prev => ({ ...prev, address_complement: e.target.value }))}
                placeholder="Sala, Bloco..."
              />
            </div>

            <div className="space-y-2">
              <Label>Bairro *</Label>
              <Input
                value={companyData.address_neighborhood}
                onChange={(e) => setCompanyData(prev => ({ ...prev, address_neighborhood: e.target.value }))}
                placeholder="Bairro"
              />
            </div>

            <div className="space-y-2">
              <Label>CEP *</Label>
              <Input
                value={companyData.address_zipcode}
                onChange={(e) => setCompanyData(prev => ({ ...prev, address_zipcode: e.target.value }))}
                placeholder="00000-000"
              />
            </div>

            <div className="space-y-2">
              <Label>Cidade</Label>
              <Input
                value={companyData.address_city}
                onChange={(e) => setCompanyData(prev => ({ ...prev, address_city: e.target.value }))}
                placeholder="Cidade"
              />
            </div>

            <div className="space-y-2">
              <Label>Estado</Label>
              <Select
                value={companyData.address_state}
                onValueChange={(value) => setCompanyData(prev => ({ ...prev, address_state: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="UF" />
                </SelectTrigger>
                <SelectContent>
                  {BRAZILIAN_STATES.map(state => (
                    <SelectItem key={state} value={state}>
                      {state}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <div className="flex justify-end">
          <Button onClick={createSubaccount} disabled={creatingSubaccount}>
            {creatingSubaccount ? (
              <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Criando conta...</>
            ) : (
              <><UserPlus className="h-4 w-4 mr-2" /> Criar Conta de Recebimento</>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
