import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Rocket, 
  CreditCard, 
  Crown, 
  Dumbbell, 
  Clock, 
  Users,
  MessageCircle,
  LayoutGrid,
  Zap,
  CheckCircle2,
  ChevronRight,
  ChevronLeft,
  PartyPopper,
  X
} from "lucide-react";
import { cn } from "@/lib/utils";

interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  icon: any;
  path: string;
  system: "gestao" | "atendimento" | "both";
  optional?: boolean;
}

const onboardingSteps: OnboardingStep[] = [
  {
    id: "payment-account",
    title: "Conta de Recebimento",
    description: "Configure sua conta para receber pagamentos online (PIX, Boleto, Cartão)",
    icon: CreditCard,
    path: "/gestao/fitness/metodos-pagamento",
    system: "gestao",
    optional: true
  },
  {
    id: "plans",
    title: "Planos",
    description: "Crie os planos que serão oferecidos aos seus clientes",
    icon: Crown,
    path: "/gestao/fitness/planos",
    system: "gestao"
  },
  {
    id: "class-types",
    title: "Tipos de Aula",
    description: "Defina as modalidades oferecidas (Musculação, Spinning, etc.)",
    icon: Dumbbell,
    path: "/gestao/fitness/tipos-aula",
    system: "gestao"
  },
  {
    id: "schedule",
    title: "Grade de Horários",
    description: "Configure os horários das aulas semanais",
    icon: Clock,
    path: "/gestao/fitness/horarios",
    system: "gestao"
  },
  {
    id: "members",
    title: "Clientes",
    description: "Cadastre seus primeiros clientes",
    icon: Users,
    path: "/gestao/fitness/clientes",
    system: "gestao"
  },
  {
    id: "whatsapp",
    title: "Conexão WhatsApp",
    description: "Conecte seu WhatsApp para atendimento e notificações",
    icon: MessageCircle,
    path: "/integrations/whatsapp",
    system: "atendimento",
    optional: true
  },
  {
    id: "queues",
    title: "Filas de Atendimento",
    description: "Organize os atendimentos por setores",
    icon: LayoutGrid,
    path: "/queues",
    system: "atendimento"
  },
  {
    id: "quick-messages",
    title: "Mensagens Rápidas",
    description: "Crie respostas prontas para agilizar o atendimento",
    icon: Zap,
    path: "/quick-messages",
    system: "atendimento",
    optional: true
  }
];

const ONBOARDING_STORAGE_KEY = "hubfit_onboarding_completed";
const ONBOARDING_DISMISSED_KEY = "hubfit_onboarding_dismissed";

interface OnboardingWizardProps {
  systemType?: "gestao" | "atendimento";
  onNavigate?: (path: string) => void;
}

export function OnboardingWizard({ systemType = "gestao", onNavigate }: OnboardingWizardProps) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<string[]>([]);
  const [selectedSystem, setSelectedSystem] = useState<"gestao" | "atendimento" | "both">(systemType);

  useEffect(() => {
    checkOnboardingStatus();
  }, [user?.id]);

  useEffect(() => {
    setSelectedSystem(systemType);
  }, [systemType]);

  const checkOnboardingStatus = async () => {
    if (!user?.id) return;

    // Check if onboarding was dismissed
    const dismissed = localStorage.getItem(ONBOARDING_DISMISSED_KEY);
    if (dismissed === "true") return;

    // Check if onboarding was completed
    const completed = localStorage.getItem(ONBOARDING_STORAGE_KEY);
    if (completed === "true") return;

    // Check if this is a new user (created in the last 7 days)
    const { data: profile } = await supabase
      .from("profiles")
      .select("created_at")
      .eq("user_id", user.id)
      .single();

    if (profile) {
      const createdAt = new Date(profile.created_at || "");
      const daysSinceCreation = (Date.now() - createdAt.getTime()) / (1000 * 60 * 60 * 24);
      
      if (daysSinceCreation <= 7) {
        setOpen(true);
      }
    }
  };

  const filteredSteps = onboardingSteps.filter(
    step => step.system === selectedSystem || step.system === "both"
  );

  const progress = (completedSteps.length / filteredSteps.length) * 100;

  const handleStepClick = (step: OnboardingStep) => {
    if (onNavigate) {
      onNavigate(step.path);
    } else {
      navigate(step.path);
    }
    setOpen(false);
  };

  const markStepComplete = (stepId: string) => {
    if (!completedSteps.includes(stepId)) {
      setCompletedSteps([...completedSteps, stepId]);
    }
  };

  const handleComplete = () => {
    localStorage.setItem(ONBOARDING_STORAGE_KEY, "true");
    setOpen(false);
  };

  const handleDismiss = () => {
    localStorage.setItem(ONBOARDING_DISMISSED_KEY, "true");
    setOpen(false);
  };

  const handleSkip = () => {
    if (currentStep < filteredSteps.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-2xl p-0 gap-0 overflow-hidden">
        {/* Header */}
        <div className="relative bg-gradient-to-r from-primary to-primary/80 text-primary-foreground p-6">
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-2 top-2 text-primary-foreground/70 hover:text-primary-foreground hover:bg-primary-foreground/10"
            onClick={handleDismiss}
          >
            <X className="h-4 w-4" />
          </Button>
          
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-xl bg-primary-foreground/20 flex items-center justify-center">
              <Rocket className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold">Bem-vindo ao Sistema!</h2>
              <p className="text-sm text-primary-foreground/80">
                Vamos configurar tudo para você começar
              </p>
            </div>
          </div>

          {/* System Selector */}
          <div className="flex gap-2">
            <Button
              variant={selectedSystem === "gestao" ? "secondary" : "ghost"}
              size="sm"
              onClick={() => setSelectedSystem("gestao")}
              className={cn(
                selectedSystem !== "gestao" && "text-primary-foreground/70 hover:text-primary-foreground hover:bg-primary-foreground/10"
              )}
            >
              Gestão (Academia)
            </Button>
            <Button
              variant={selectedSystem === "atendimento" ? "secondary" : "ghost"}
              size="sm"
              onClick={() => setSelectedSystem("atendimento")}
              className={cn(
                selectedSystem !== "atendimento" && "text-primary-foreground/70 hover:text-primary-foreground hover:bg-primary-foreground/10"
              )}
            >
              Atendimento (WhatsApp)
            </Button>
          </div>

          {/* Progress */}
          <div className="mt-4">
            <div className="flex justify-between text-xs mb-1">
              <span>{completedSteps.length} de {filteredSteps.length} etapas</span>
              <span>{Math.round(progress)}%</span>
            </div>
            <Progress value={progress} className="h-2 bg-primary-foreground/20" />
          </div>
        </div>

        {/* Steps */}
        <div className="p-6 max-h-[400px] overflow-y-auto">
          <div className="space-y-3">
            {filteredSteps.map((step, index) => {
              const isCompleted = completedSteps.includes(step.id);
              
              return (
                <Card 
                  key={step.id}
                  className={cn(
                    "cursor-pointer transition-all",
                    isCompleted && "bg-primary/5 border-primary/30",
                    !isCompleted && "hover:border-primary/50"
                  )}
                  onClick={() => handleStepClick(step)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center gap-4">
                      <div className={cn(
                        "w-10 h-10 rounded-lg flex items-center justify-center shrink-0",
                        isCompleted ? "bg-primary text-primary-foreground" : "bg-muted"
                      )}>
                        {isCompleted ? (
                          <CheckCircle2 className="h-5 w-5" />
                        ) : (
                          <step.icon className="h-5 w-5" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h4 className={cn(
                            "font-medium",
                            isCompleted && "text-primary"
                          )}>
                            {step.title}
                          </h4>
                          {step.optional && (
                            <Badge variant="outline" className="text-xs">
                              Opcional
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground truncate">
                          {step.description}
                        </p>
                      </div>
                      <ChevronRight className="h-5 w-5 text-muted-foreground shrink-0" />
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="border-t p-4 flex justify-between items-center bg-muted/30">
          <Button variant="ghost" onClick={handleDismiss}>
            Configurar depois
          </Button>
          
          {completedSteps.length === filteredSteps.length ? (
            <Button onClick={handleComplete} className="gap-2">
              <PartyPopper className="h-4 w-4" />
              Concluir
            </Button>
          ) : (
            <Button variant="outline" onClick={() => navigate("/gestao/fitness/ajuda")}>
              Ver guia completo
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Hook to manually trigger onboarding
export function useOnboarding() {
  const resetOnboarding = () => {
    localStorage.removeItem(ONBOARDING_STORAGE_KEY);
    localStorage.removeItem(ONBOARDING_DISMISSED_KEY);
    window.location.reload();
  };

  return { resetOnboarding };
}
