import { Settings, Cog } from 'lucide-react';
import { PaymentMethodsSettings } from './settings/PaymentMethodsSettings';
import { AsaasCompanySettings } from './settings/AsaasCompanySettings';
import { PageHeader } from '@/components/gestao/ui';

export function FitnessSettingsPage() {
  return (
    <div className="p-6 h-full overflow-auto">
      <PageHeader
        title="Configurações"
        description="Configure as opções do módulo de gestão fitness"
        icon={<Cog className="h-6 w-6" />}
      />

      <div className="space-y-6">
        <AsaasCompanySettings />
        <PaymentMethodsSettings />
      </div>
    </div>
  );
}
