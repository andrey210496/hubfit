import { ReactNode } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { CheckCircle2, XCircle, Settings, RefreshCw, Loader2, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

interface LLMConfiguration {
  id: string;
  provider: string;
  default_model: string;
  is_active: boolean;
  last_tested_at: string | null;
  last_test_status: string | null;
  last_test_error: string | null;
  api_key_masked?: string;
}

interface LLMProviderCardProps {
  provider: string;
  name: string;
  subtitle?: string;
  logo: ReactNode;
  models: string[];
  config?: LLMConfiguration;
  loading: boolean;
  comingSoon?: boolean;
  onConfigure?: () => void;
  onTest?: () => void;
  testing?: boolean;
}

export function LLMProviderCard({
  provider,
  name,
  subtitle,
  logo,
  models,
  config,
  loading,
  comingSoon,
  onConfigure,
  onTest,
  testing,
}: LLMProviderCardProps) {
  const isConfigured = !!config && config.is_active;
  const hasError = config?.last_test_status === 'error';

  const getStatusBadge = () => {
    if (comingSoon) {
      return <Badge variant="secondary">Em breve</Badge>;
    }
    if (loading) {
      return <Skeleton className="h-5 w-20" />;
    }
    if (!config) {
      return <Badge variant="secondary" className="gap-1">Não configurado</Badge>;
    }
    if (hasError) {
      return (
        <Badge variant="destructive" className="gap-1">
          <XCircle className="h-3 w-3" />
          Erro
        </Badge>
      );
    }
    if (isConfigured) {
      return (
        <Badge variant="default" className="gap-1 bg-green-600 hover:bg-green-700">
          <CheckCircle2 className="h-3 w-3" />
          Conectado
        </Badge>
      );
    }
    return <Badge variant="secondary">Não configurado</Badge>;
  };

  return (
    <Card
      className={cn(
        "transition-all duration-200",
        comingSoon && "opacity-60",
        hasError && "border-destructive/50 bg-destructive/5",
        isConfigured && !hasError && "border-green-500/30 bg-green-500/5"
      )}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            {logo}
            <div>
              <h3 className="font-semibold">
                {name}
                {subtitle && <span className="text-muted-foreground font-normal ml-1">{subtitle}</span>}
              </h3>
              {config?.default_model && (
                <p className="text-xs text-muted-foreground">
                  Modelo: {config.default_model}
                </p>
              )}
            </div>
          </div>
          {getStatusBadge()}
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Available Models */}
        <div>
          <p className="text-xs text-muted-foreground mb-2">Modelos disponíveis:</p>
          <div className="flex flex-wrap gap-1">
            {models.slice(0, 4).map((model) => (
              <Badge key={model} variant="outline" className="text-xs font-normal">
                {model}
              </Badge>
            ))}
            {models.length > 4 && (
              <Badge variant="outline" className="text-xs font-normal">
                +{models.length - 4}
              </Badge>
            )}
          </div>
        </div>

        {/* Error Message */}
        {hasError && config.last_test_error && (
          <div className="p-2 rounded-md bg-destructive/10 text-destructive text-xs">
            {config.last_test_error}
          </div>
        )}

        {/* Last Tested */}
        {config?.last_tested_at && (
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Clock className="h-3 w-3" />
            <span>
              Testado {formatDistanceToNow(new Date(config.last_tested_at), { 
                addSuffix: true, 
                locale: ptBR 
              })}
            </span>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2 pt-2">
          {!comingSoon ? (
            <>
              <Button
                onClick={onConfigure}
                variant={isConfigured ? "outline" : "default"}
                className="flex-1 gap-2"
                disabled={loading}
              >
                <Settings className="h-4 w-4" />
                {isConfigured ? "Editar" : "Configurar"}
              </Button>
              {isConfigured && (
                <Button
                  onClick={onTest}
                  variant="outline"
                  disabled={testing}
                  className="gap-2"
                >
                  {testing ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <RefreshCw className="h-4 w-4" />
                  )}
                  Testar
                </Button>
              )}
            </>
          ) : (
            <Button variant="secondary" disabled className="flex-1">
              Em desenvolvimento
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
