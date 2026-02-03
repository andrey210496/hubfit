import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { z } from 'zod';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Lock } from 'lucide-react';

const passwordSchema = z
  .object({
    password: z.string().min(6, 'Senha deve ter no mínimo 6 caracteres'),
    confirmPassword: z.string().min(6, 'Senha deve ter no mínimo 6 caracteres'),
  })
  .refine((v) => v.password === v.confirmPassword, {
    message: 'As senhas não coincidem',
    path: ['confirmPassword'],
  });

export default function MemberResetPassword() {
  const navigate = useNavigate();
  const { toast } = useToast();

  const [checking, setChecking] = useState(true);
  const [hasSession, setHasSession] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  useEffect(() => {
    document.title = 'Redefinir Senha | HubFit';

    const metaDescription = document.querySelector('meta[name="description"]');
    metaDescription?.setAttribute('content', 'Redefina sua senha e acesse o Portal do Aluno HubFit.');

    supabase.auth.getSession().then(({ data: { session } }) => {
      setHasSession(!!session);
      setChecking(false);
    });
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      passwordSchema.parse({ password, confirmPassword });
    } catch (err) {
      if (err instanceof z.ZodError) {
        toast({
          title: 'Erro de validação',
          description: err.errors[0].message,
          variant: 'destructive',
        });
      }
      return;
    }

    setIsLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setIsLoading(false);

    if (error) {
      toast({
        title: 'Erro ao redefinir senha',
        description: error.message,
        variant: 'destructive',
      });
      return;
    }

    toast({
      title: 'Senha atualizada!',
      description: 'Sua senha foi redefinida com sucesso. Você já pode acessar o portal.',
    });

    navigate('/aluno', { replace: true });
  };

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-primary/5">
        <div className="relative">
          <div className="absolute inset-0 rounded-full bg-primary/20 blur-xl animate-pulse" />
          <Loader2 className="h-12 w-12 animate-spin text-primary relative z-10" />
        </div>
      </div>
    );
  }

  if (!hasSession) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-primary/5 p-4">
        <div className="max-w-md w-full space-y-6 rounded-2xl border border-border/50 bg-background/70 backdrop-blur p-8 shadow-lg">
          <header className="space-y-2">
            <h1 className="text-2xl font-bold text-foreground">Link inválido ou expirado</h1>
            <p className="text-muted-foreground">
              Volte para o login e solicite novamente a redefinição de senha.
            </p>
          </header>

          <Button className="w-full" onClick={() => navigate('/aluno/login', { replace: true })}>
            Ir para o login
          </Button>
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-primary/5 p-4">
      <section className="max-w-md w-full space-y-6 rounded-2xl border border-border/50 bg-background/70 backdrop-blur p-8 shadow-lg">
        <header className="space-y-2">
          <h1 className="text-2xl font-bold text-foreground">Redefinir senha</h1>
          <p className="text-muted-foreground">Crie uma nova senha para acessar o Portal do Aluno.</p>
        </header>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="password">Nova senha</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="pl-10 h-12 rounded-xl border-border/50 bg-background/50 focus:bg-background transition-colors"
                disabled={isLoading}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Confirmar senha</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <Input
                id="confirmPassword"
                type="password"
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="pl-10 h-12 rounded-xl border-border/50 bg-background/50 focus:bg-background transition-colors"
                disabled={isLoading}
              />
            </div>
          </div>

          <Button className="w-full h-12 rounded-xl" disabled={isLoading} type="submit">
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                Salvando...
              </>
            ) : (
              'Salvar nova senha'
            )}
          </Button>
        </form>

        <footer className="text-sm text-muted-foreground">
          Dica: se você não receber o e-mail, verifique a caixa de spam.
        </footer>
      </section>
    </main>
  );
}
