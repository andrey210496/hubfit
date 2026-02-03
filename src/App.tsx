import { Suspense, lazy } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { Loader2 } from "lucide-react";

// Lazy load all pages for code-splitting
const Index = lazy(() => import("./pages/Index"));
const Auth = lazy(() => import("./pages/Auth"));
const Install = lazy(() => import("./pages/Install"));
const NotFound = lazy(() => import("./pages/NotFound"));
const MemberPortal = lazy(() => import("./pages/aluno"));
const AgentBuilder = lazy(() => import("@/components/ai-agents/AgentBuilder").then(m => ({ default: m.AgentBuilder })));


const queryClient = new QueryClient();

// Loading fallback component
const PageLoader = () => (
  <div className="min-h-screen flex items-center justify-center bg-background">
    <Loader2 className="h-8 w-8 animate-spin text-primary" />
  </div>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Suspense fallback={<PageLoader />}>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/auth" element={<Auth />} />
              {/* Dashboard routes - all paths that should show Dashboard */}
              <Route path="/dashboard" element={<Index />} />
              <Route path="/tickets" element={<Index />} />
              <Route path="/atendimento" element={<Index />} />
              <Route path="/kanban" element={<Index />} />
              <Route path="/quick-messages" element={<Index />} />
              <Route path="/contacts" element={<Index />} />
              <Route path="/schedules" element={<Index />} />
              <Route path="/tags" element={<Index />} />
              <Route path="/helps" element={<Index />} />
              <Route path="/files" element={<Index />} />
              <Route path="/queues" element={<Index />} />
              <Route path="/users" element={<Index />} />
              <Route path="/financeiro" element={<Index />} />
              <Route path="/settings" element={<Index />} />
              <Route path="/admin/dashboard" element={<Index />} />
              <Route path="/admin/plans" element={<Index />} />
              <Route path="/admin/companies" element={<Index />} />
              <Route path="/admin/invoices" element={<Index />} />
              <Route path="/admin/automations" element={<Index />} />
              <Route path="/admin/ai-agents" element={<Index />} />
              <Route path="/admin/ai-agents/new" element={<AgentBuilder />} />
              <Route path="/admin/ai-agents/:id" element={<AgentBuilder />} />

              <Route path="/admin/announcements" element={<Index />} />
              <Route path="/admin/whatsapp-hub" element={<Index />} />
              <Route path="/admin/integrations/*" element={<Index />} />
              <Route path="/admin/asaas" element={<Index />} />
              <Route path="/memory-base" element={<Index />} />
              <Route path="/templates" element={<Index />} />
              <Route path="/integrations/whatsapp" element={<Index />} />
              {/* Sistema de Gestão routes */}
              <Route path="/gestao/fluxo-caixa" element={<Index />} />
              <Route path="/gestao/contas-pagar" element={<Index />} />
              <Route path="/gestao/contas-receber" element={<Index />} />
              <Route path="/gestao/produtos" element={<Index />} />
              <Route path="/gestao/categorias" element={<Index />} />
              <Route path="/gestao/relatorios" element={<Index />} />
              <Route path="/gestao/kpis" element={<Index />} />
              {/* Fitness Management routes */}
              <Route path="/gestao/fitness/dashboard" element={<Index />} />
              <Route path="/gestao/fitness/par-q" element={<Index />} />
              <Route path="/gestao/fitness/planos" element={<Index />} />
              <Route path="/gestao/fitness/clientes" element={<Index />} />
              <Route path="/gestao/fitness/clientes/perfil" element={<Index />} />
              <Route path="/gestao/fitness/tipos-aula" element={<Index />} />
              <Route path="/gestao/fitness/salas" element={<Index />} />
              <Route path="/gestao/fitness/horarios" element={<Index />} />
              <Route path="/gestao/fitness/agenda" element={<Index />} />
              <Route path="/gestao/fitness/acesso" element={<Index />} />
              <Route path="/gestao/fitness/metodos-pagamento" element={<Index />} />
              <Route path="/gestao/fitness/cupons" element={<Index />} />
              <Route path="/gestao/fitness/categorias-financeiras" element={<Index />} />
              <Route path="/gestao/fitness/fornecedores" element={<Index />} />
              <Route path="/gestao/fitness/perfis-acesso" element={<Index />} />
              <Route path="/gestao/fitness/ajuda" element={<Index />} />
              <Route path="/admin/meta-config" element={<Index />} />
              <Route path="/install" element={<Install />} />
              {/* Portal do Aluno routes */}
              <Route path="/aluno/*" element={<MemberPortal />} />
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
