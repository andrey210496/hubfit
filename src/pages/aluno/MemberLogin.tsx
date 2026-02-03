import { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { useMemberAuth } from '@/hooks/useMemberAuth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Dumbbell, Eye, EyeOff, Mail, Lock, UserPlus } from 'lucide-react';
import { z } from 'zod';

const loginSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(6, 'Senha deve ter no mínimo 6 caracteres'),
});

const emailSchema = z.object({
  email: z.string().email('Email inválido'),
});

export default function MemberLogin() {
  const { user, loading, isMember, signIn, signUp, signOut } = useMemberAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [confirmPassword, setConfirmPassword] = useState('');

  useEffect(() => {
    document.title = 'Portal do Aluno | HubFit';
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-primary/5">
        <div className="relative">
          <div className="absolute inset-0 rounded-full bg-primary/20 blur-xl animate-pulse" />
          <Loader2 className="h-12 w-12 animate-spin text-primary relative z-10" />
        </div>
      </div>
    );
  }

  if (user && isMember) {
    return <Navigate to="/aluno" replace />;
  }

  if (user && !isMember) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-primary/5 p-4">
        <div className="max-w-md w-full text-center space-y-6">
          <div className="w-20 h-20 mx-auto rounded-2xl bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center shadow-2xl">
            <Dumbbell className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">Acesso Restrito</h1>
          <p className="text-muted-foreground">
            Sua conta não está vinculada a nenhum perfil de aluno.
            Entre em contato com a academia para liberar seu acesso.
          </p>
          <Button variant="outline" onClick={() => signOut()} className="w-full">
            Sair
          </Button>
        </div>
      </div>
    );
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      loginSchema.parse({ email, password });
    } catch (err) {
      if (err instanceof z.ZodError) {
        toast({
          title: 'Erro de validação',
          description: err.errors[0].message,
          variant: 'destructive',
        });
        return;
      }
    }

    setIsLoading(true);
    const { error } = await signIn(email, password);
    setIsLoading(false);

    if (error) {
      toast({
        title: 'Erro ao entrar',
        description: error.message === 'Invalid login credentials' ? 'Email ou senha incorretos' : error.message,
        variant: 'destructive',
      });
    }
  };

  const handleForgotPassword = async () => {
    try {
      emailSchema.parse({ email });
    } catch (err) {
      if (err instanceof z.ZodError) {
        toast({
          title: 'Informe seu e-mail',
          description: err.errors[0].message,
          variant: 'destructive',
        });
      }
      return;
    }

    setIsLoading(true);
    const redirectTo = `${window.location.origin}/aluno/redefinir-senha`;
    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });
    setIsLoading(false);

    if (error) {
      toast({
        title: 'Erro ao enviar link',
        description: error.message,
        variant: 'destructive',
      });
      return;
    }

    toast({
      title: 'Link enviado',
      description: 'Enviamos um link para redefinir sua senha. Verifique sua caixa de entrada e o spam.',
    });
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      loginSchema.parse({ email, password });
    } catch (err) {
      if (err instanceof z.ZodError) {
        toast({
          title: 'Erro de validação',
          description: err.errors[0].message,
          variant: 'destructive',
        });
        return;
      }
    }

    if (password !== confirmPassword) {
      toast({
        title: 'Erro de validação',
        description: 'As senhas não coincidem',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);
    const { error } = await signUp(email, password);
    setIsLoading(false);

    if (error) {
      const msg = error.message.toLowerCase();
      const isRecoverHint = msg.includes('enviamos um link') || msg.includes('reenviamos');

      toast({
        title: isRecoverHint ? 'Verifique seu e-mail' : 'Erro ao cadastrar',
        description: error.message,
        variant: isRecoverHint ? undefined : 'destructive',
      });

      if (isRecoverHint) {
        setIsSignUp(false);
        setConfirmPassword('');
      }
      return;
    }

    toast({
      title: 'Cadastro realizado!',
      description: 'Se necessário, confirme o e-mail e depois faça login.',
    });
    setIsSignUp(false);
    setConfirmPassword('');
  };

  return (
    <div className="min-h-screen flex bg-gradient-to-br from-background via-background to-primary/5">
      {/* Left side - Branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-primary via-primary/90 to-primary/80 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-20 left-20 w-72 h-72 bg-white rounded-full blur-3xl" />
          <div className="absolute bottom-20 right-20 w-96 h-96 bg-white rounded-full blur-3xl" />
        </div>

        <div className="relative z-10 flex flex-col justify-center items-center w-full p-12 text-white">
          <div className="w-24 h-24 rounded-3xl bg-white/20 backdrop-blur-sm flex items-center justify-center mb-8 shadow-2xl">
            <Dumbbell className="w-14 h-14" />
          </div>
          <h1 className="text-4xl font-bold mb-4 text-center">Portal do Aluno</h1>
          <p className="text-xl text-white/80 text-center max-w-md">
            Acesse sua agenda, faça check-in nas aulas e acompanhe seu progresso
          </p>

          <div className="mt-12 grid grid-cols-2 gap-6 text-center">
            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6">
              <div className="text-3xl font-bold mb-1">📅</div>
              <div className="text-sm text-white/80">Agenda de Aulas</div>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6">
              <div className="text-3xl font-bold mb-1">✓</div>
              <div className="text-sm text-white/80">Check-in Fácil</div>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6">
              <div className="text-3xl font-bold mb-1">📊</div>
              <div className="text-sm text-white/80">Seu Histórico</div>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6">
              <div className="text-3xl font-bold mb-1">📢</div>
              <div className="text-sm text-white/80">Avisos</div>
            </div>
          </div>
        </div>
      </div>

      {/* Right side - Login/SignUp Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8">
        <div className="w-full max-w-md space-y-8">
          {/* Mobile logo */}
          <div className="lg:hidden text-center mb-8">
            <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center shadow-xl mb-4">
              <Dumbbell className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-foreground">Portal do Aluno</h1>
          </div>

          <div className="space-y-2">
            <h2 className="text-3xl font-bold text-foreground">{isSignUp ? 'Criar Conta' : 'Bem-vindo!'}</h2>
            <p className="text-muted-foreground">
              {isSignUp
                ? 'Cadastre-se para acessar o portal (necessário ter plano ativo)'
                : 'Entre com suas credenciais para acessar o portal'}
            </p>
          </div>

          <form onSubmit={isSignUp ? handleSignUp : handleLogin} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-medium">
                Email
              </Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="seu@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10 h-12 rounded-xl border-border/50 bg-background/50 focus:bg-background transition-colors"
                  disabled={isLoading}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm font-medium">
                Senha
              </Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10 pr-10 h-12 rounded-xl border-border/50 bg-background/50 focus:bg-background transition-colors"
                  disabled={isLoading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>

            {!isSignUp && (
              <div className="flex items-center justify-end">
                <button
                  type="button"
                  onClick={handleForgotPassword}
                  disabled={isLoading}
                  className="text-sm text-primary font-medium hover:underline disabled:opacity-50"
                >
                  Esqueci minha senha
                </button>
              </div>
            )}

            {isSignUp && (
              <div className="space-y-2">
                <Label htmlFor="confirmPassword" className="text-sm font-medium">
                  Confirmar Senha
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                  <Input
                    id="confirmPassword"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="pl-10 h-12 rounded-xl border-border/50 bg-background/50 focus:bg-background transition-colors"
                    disabled={isLoading}
                  />
                </div>
              </div>
            )}

            <Button
              type="submit"
              className="w-full h-12 rounded-xl bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 text-primary-foreground font-semibold shadow-lg shadow-primary/25 transition-all duration-300"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  {isSignUp ? 'Cadastrando...' : 'Entrando...'}
                </>
              ) : (
                <>
                  {isSignUp && <UserPlus className="mr-2 h-5 w-5" />}
                  {isSignUp ? 'Criar Conta' : 'Entrar'}
                </>
              )}
            </Button>
          </form>

          <div className="text-center space-y-4">
            <button
              type="button"
              onClick={() => {
                setIsSignUp(!isSignUp);
                setConfirmPassword('');
              }}
              className="text-sm text-primary font-medium hover:underline"
            >
              {isSignUp 
                ? 'Já tem uma conta? Faça login'
                : 'Primeira vez? Crie sua conta'
              }
            </button>
            
            <p className="text-sm text-muted-foreground">
              Problemas para acessar?{' '}
              <span className="text-primary font-medium">
                Entre em contato com a academia
              </span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
