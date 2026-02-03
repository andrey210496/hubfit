import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { z } from 'zod';
import { AnimatedBackground } from '@/components/auth/AnimatedBackground';
import { FloatingInput } from '@/components/auth/FloatingInput';
import { GlowButton } from '@/components/auth/GlowButton';
import { LoginAnnouncementCarousel } from '@/components/auth/LoginAnnouncementCarousel';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import hubfitLogo from '@/assets/logo.png';
import { Loader2, Mail, Lock, User, ArrowRight, Sparkles, Sun, Moon, Building2, Phone, Globe, CreditCard } from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';

import { PasswordStrengthIndicator, validatePasswordStrength } from '@/components/auth/PasswordStrengthIndicator';

const loginSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(6, 'Senha deve ter no mínimo 6 caracteres'),
});

const signupSchema = z.object({
  name: z.string().min(2, 'Nome deve ter no mínimo 2 caracteres'),
  companyName: z.string().min(2, 'Nome da empresa deve ter no mínimo 2 caracteres'),
  email: z.string().email('Email inválido'),
  phone: z.string().min(10, 'Celular deve ter no mínimo 10 dígitos'),
  password: z.string()
    .min(8, 'Senha deve ter no mínimo 8 caracteres')
    .regex(/[A-Z]/, 'Senha deve conter pelo menos uma letra maiúscula')
    .regex(/[a-z]/, 'Senha deve conter pelo menos uma letra minúscula')
    .regex(/[0-9]/, 'Senha deve conter pelo menos um número'),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'As senhas não coincidem',
  path: ['confirmPassword'],
});

interface Plan {
  id: string;
  name: string;
  price: number;
}

const COUNTRIES = [
  { code: 'BR', name: 'Brasil', flag: '🇧🇷' },
  { code: 'PT', name: 'Portugal', flag: '🇵🇹' },
  { code: 'US', name: 'Estados Unidos', flag: '🇺🇸' },
  { code: 'ES', name: 'Espanha', flag: '🇪🇸' },
  { code: 'AR', name: 'Argentina', flag: '🇦🇷' },
  { code: 'MX', name: 'México', flag: '🇲🇽' },
  { code: 'CL', name: 'Chile', flag: '🇨🇱' },
  { code: 'CO', name: 'Colômbia', flag: '🇨🇴' },
];

export default function Auth() {
  const { user, loading, signIn, signUp } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'login' | 'signup'>('login');
  const [plans, setPlans] = useState<Plan[]>([]);

  // Theme state
  const [darkMode, setDarkMode] = useState(() => {
    if (typeof window !== 'undefined') {
      return document.documentElement.classList.contains('dark');
    }
    return false;
  });

  // Login state
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  // Signup state
  const [signupName, setSignupName] = useState('');
  const [signupCompanyName, setSignupCompanyName] = useState('');
  const [signupEmail, setSignupEmail] = useState('');
  const [signupPhone, setSignupPhone] = useState('');
  const [signupCountry, setSignupCountry] = useState('BR');
  const [signupPlanId, setSignupPlanId] = useState('');
  const [signupPassword, setSignupPassword] = useState('');
  const [signupConfirmPassword, setSignupConfirmPassword] = useState('');

  // Fetch plans
  useEffect(() => {
    const fetchPlans = async () => {
      const { data } = await supabase
        .from('plans')
        .select('id, name, price')
        .order('price', { ascending: true });
      
      if (data) {
        setPlans(data);
        // Set default plan to first (free) plan
        if (data.length > 0 && !signupPlanId) {
          setSignupPlanId(data[0].id);
        }
      }
    };
    fetchPlans();
  }, []);

  // Apply dark mode effect
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('theme', darkMode ? 'dark' : 'light');
  }, [darkMode]);

  // Initialize dark mode from localStorage
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark') {
      setDarkMode(true);
    } else if (savedTheme === 'light') {
      setDarkMode(false);
    }
  }, []);

  useEffect(() => {
    document.title = 'Entrar | HubFit';
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="relative">
          <div className="absolute inset-0 rounded-full bg-primary/20 blur-xl animate-pulse" />
          <Loader2 className="h-12 w-12 animate-spin text-primary relative z-10" />
        </div>
      </div>
    );
  }

  if (user) {
    return <Navigate to="/" replace />;
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      loginSchema.parse({ email: loginEmail, password: loginPassword });
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
    const { error } = await signIn(loginEmail, loginPassword);
    setIsLoading(false);

    if (error) {
      toast({
        title: 'Erro ao entrar',
        description:
          error.message === 'Invalid login credentials'
            ? 'Email ou senha incorretos'
            : error.message,
        variant: 'destructive',
      });
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate password strength first
    const strengthValidation = validatePasswordStrength(signupPassword);
    if (!strengthValidation.isValid) {
      toast({
        title: 'Senha muito fraca',
        description: strengthValidation.message,
        variant: 'destructive',
      });
      return;
    }

    try {
      signupSchema.parse({
        name: signupName,
        companyName: signupCompanyName,
        email: signupEmail,
        phone: signupPhone,
        password: signupPassword,
        confirmPassword: signupConfirmPassword,
      });
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
    const { error } = await signUp({
      email: signupEmail,
      password: signupPassword,
      name: signupName,
      companyName: signupCompanyName,
      phone: signupPhone,
      country: signupCountry,
      planId: signupPlanId || undefined,
    });
    setIsLoading(false);

    if (error) {
      if (error.message.includes('already registered')) {
        toast({
          title: 'Usuário já cadastrado',
          description: 'Este email já está em uso. Tente fazer login.',
          variant: 'destructive',
        });
      } else {
        toast({
          title: 'Erro ao cadastrar',
          description: error.message,
          variant: 'destructive',
        });
      }
    } else {
      toast({
        title: 'Cadastro realizado!',
        description: 'Sua empresa foi criada. Você já pode fazer login.',
      });
      setActiveTab('login');
      // Pre-fill login email
      setLoginEmail(signupEmail);
    }
  };

  const formatPhone = (value: string) => {
    // Remove non-digits
    const digits = value.replace(/\D/g, '');
    // Limit to 11 digits
    const limited = digits.slice(0, 11);
    // Format as (XX) XXXXX-XXXX
    if (limited.length <= 2) return limited;
    if (limited.length <= 7) return `(${limited.slice(0, 2)}) ${limited.slice(2)}`;
    return `(${limited.slice(0, 2)}) ${limited.slice(2, 7)}-${limited.slice(7)}`;
  };

  return (
    <main className="min-h-screen flex flex-col md:flex-row bg-background overflow-hidden relative">
      {/* Theme Toggle Button */}
      <Button 
        variant="ghost" 
        size="icon" 
        className="absolute top-4 right-4 z-50 h-10 w-10 rounded-xl backdrop-blur-sm bg-card/50 border border-border/50 hover:bg-card/80"
        onClick={() => setDarkMode(!darkMode)}
      >
        {darkMode ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
      </Button>

      {/* Animated particle background */}
      <AnimatedBackground />

      {/* Gradient orbs */}
      <div className="absolute top-0 left-0 w-[600px] h-[600px] bg-primary/10 rounded-full blur-[120px] -translate-x-1/2 -translate-y-1/2 pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-secondary/10 rounded-full blur-[100px] translate-x-1/3 translate-y-1/3 pointer-events-none" />

      {/* Left side - Login Form */}
      <section className="w-full md:w-[480px] lg:w-[520px] flex flex-col items-center justify-center p-4 md:p-6 lg:p-8 relative z-10 overflow-y-auto">
        <div className="w-full max-w-[400px]">
          {/* Logo and header */}
          <header className="text-center mb-6 animate-fade-up">
            <div className="inline-flex items-center justify-center mb-3 relative">
              <div className="absolute inset-0 bg-primary/20 rounded-3xl blur-2xl" />
              <img
                src={hubfitLogo}
                alt="HubFit"
                className="w-36 h-12 object-contain relative z-10"
              />
            </div>
            <p className="text-muted-foreground text-xs flex items-center justify-center gap-1.5">
              <Sparkles className="w-3 h-3 text-primary" />
              Plataforma completa de gestão
              <Sparkles className="w-3 h-3 text-secondary" />
            </p>
          </header>

          {/* Glass card */}
          <div className="relative animate-scale-in" style={{ animationDelay: '0.1s' }}>
            {/* Card glow */}
            <div className="absolute -inset-px rounded-2xl bg-gradient-to-b from-primary/20 via-transparent to-secondary/20 blur-sm" />
            
            <div className="relative backdrop-blur-xl bg-card/60 rounded-2xl border border-border/50 p-5 shadow-2xl">
              {/* Tab switcher */}
              <div className="relative mb-5">
                <div className="flex bg-muted/50 rounded-xl p-1">
                  <button
                    type="button"
                    onClick={() => setActiveTab('login')}
                    className={cn(
                      "flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all duration-300 relative",
                      activeTab === 'login'
                        ? "text-primary-foreground"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    {activeTab === 'login' && (
                      <div className="absolute inset-0 gradient-coral rounded-lg shadow-md shadow-primary/20" />
                    )}
                    <span className="relative z-10">Entrar</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('signup')}
                    className={cn(
                      "flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all duration-300 relative",
                      activeTab === 'signup'
                        ? "text-secondary-foreground"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    {activeTab === 'signup' && (
                      <div className="absolute inset-0 gradient-teal rounded-lg shadow-md shadow-secondary/20" />
                    )}
                    <span className="relative z-10">Cadastrar</span>
                  </button>
                </div>
              </div>

              {/* Login Form */}
              {activeTab === 'login' && (
                <form onSubmit={handleLogin} className="space-y-4 animate-fade-up">
                  <FloatingInput
                    label="Email"
                    type="email"
                    icon={Mail}
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    required
                    disabled={isLoading}
                    autoComplete="email"
                  />

                  <FloatingInput
                    label="Senha"
                    type="password"
                    icon={Lock}
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    required
                    disabled={isLoading}
                    autoComplete="current-password"
                  />

                  <div className="pt-2">
                    <GlowButton
                      type="submit"
                      isLoading={isLoading}
                      loadingText="Entrando..."
                      variant="primary"
                    >
                      <span>Acessar plataforma</span>
                      <ArrowRight className="w-5 h-5" />
                    </GlowButton>
                  </div>
                </form>
              )}

              {/* Signup Form */}
              {activeTab === 'signup' && (
                <form onSubmit={handleSignup} className="space-y-3 animate-fade-up">
                  <div className="grid grid-cols-2 gap-2">
                    <FloatingInput
                      label="Nome completo"
                      type="text"
                      icon={User}
                      value={signupName}
                      onChange={(e) => setSignupName(e.target.value)}
                      required
                      disabled={isLoading}
                      autoComplete="name"
                    />

                    <FloatingInput
                      label="Empresa"
                      type="text"
                      icon={Building2}
                      value={signupCompanyName}
                      onChange={(e) => setSignupCompanyName(e.target.value)}
                      required
                      disabled={isLoading}
                    />
                  </div>

                  <FloatingInput
                    label="Email"
                    type="email"
                    icon={Mail}
                    value={signupEmail}
                    onChange={(e) => setSignupEmail(e.target.value)}
                    required
                    disabled={isLoading}
                    autoComplete="email"
                  />

                  <div className="grid grid-cols-2 gap-2">
                    <FloatingInput
                      label="Celular"
                      type="tel"
                      icon={Phone}
                      value={signupPhone}
                      onChange={(e) => setSignupPhone(formatPhone(e.target.value))}
                      required
                      disabled={isLoading}
                      autoComplete="tel"
                    />

                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground flex items-center gap-1.5 pl-1">
                        <Globe className="w-3 h-3" />
                        País
                      </Label>
                      <Select value={signupCountry} onValueChange={setSignupCountry} disabled={isLoading}>
                        <SelectTrigger className="h-11 bg-background/50 border-border/50 text-sm">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {COUNTRIES.map((country) => (
                            <SelectItem key={country.code} value={country.code}>
                              <span className="flex items-center gap-2">
                                <span>{country.flag}</span>
                                <span className="text-sm">{country.name}</span>
                              </span>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground flex items-center gap-1.5 pl-1">
                      <CreditCard className="w-3 h-3" />
                      Plano
                    </Label>
                    <Select value={signupPlanId} onValueChange={setSignupPlanId} disabled={isLoading}>
                      <SelectTrigger className="h-11 bg-background/50 border-border/50 text-sm">
                        <SelectValue placeholder="Selecione um plano" />
                      </SelectTrigger>
                      <SelectContent>
                        {plans.map((plan) => (
                          <SelectItem key={plan.id} value={plan.id}>
                            <span className="flex items-center gap-2">
                              <span>{plan.name}</span>
                              {plan.price === 0 ? (
                                <span className="text-xs text-green-500 font-medium">Grátis</span>
                              ) : (
                                <span className="text-xs text-muted-foreground">R$ {plan.price.toFixed(2)}/mês</span>
                              )}
                            </span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <FloatingInput
                        label="Senha"
                        type="password"
                        icon={Lock}
                        value={signupPassword}
                        onChange={(e) => setSignupPassword(e.target.value)}
                        required
                        disabled={isLoading}
                        autoComplete="new-password"
                      />
                    </div>

                    <FloatingInput
                      label="Confirmar senha"
                      type="password"
                      icon={Lock}
                      value={signupConfirmPassword}
                      onChange={(e) => setSignupConfirmPassword(e.target.value)}
                      required
                      disabled={isLoading}
                      autoComplete="new-password"
                    />
                  </div>
                  
                  <PasswordStrengthIndicator password={signupPassword} />

                  <div className="pt-1">
                    <GlowButton
                      type="submit"
                      isLoading={isLoading}
                      loadingText="Criando..."
                      variant="secondary"
                    >
                      <span>Começar agora</span>
                      <ArrowRight className="w-4 h-4" />
                    </GlowButton>
                  </div>
                </form>
              )}
            </div>
          </div>

          {/* Footer */}
          <footer className="text-center mt-4 animate-fade-up" style={{ animationDelay: '0.2s' }}>
            <p className="text-muted-foreground text-xs">
              HubFit © {new Date().getFullYear()} • Todos os direitos reservados
            </p>
          </footer>
        </div>
      </section>

      {/* Right side - Announcements with enhanced design */}
      <section className="hidden md:block flex-1 relative overflow-hidden min-h-[50vh] md:min-h-screen">
        {/* Gradient background */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary/90 via-primary to-primary/80" />
        
        {/* Animated mesh gradient overlay */}
        <div className="absolute inset-0 opacity-30">
          <div className="absolute top-0 left-0 w-full h-full">
            <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-secondary/50 rounded-full blur-[100px] animate-pulse" style={{ animationDuration: '4s' }} />
            <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-primary-foreground/20 rounded-full blur-[80px] animate-pulse" style={{ animationDuration: '6s', animationDelay: '1s' }} />
          </div>
        </div>

        {/* Geometric patterns */}
        <div className="absolute inset-0 overflow-hidden opacity-20">
          {/* Hexagon grid pattern */}
          <svg className="absolute inset-0 w-full h-full" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="hexagons" width="50" height="43.4" patternUnits="userSpaceOnUse" patternTransform="scale(2)">
                <polygon 
                  fill="none" 
                  stroke="currentColor" 
                  strokeWidth="0.5"
                  points="24.8,22 37.3,29.2 37.3,43.7 24.8,50.9 12.3,43.7 12.3,29.2" 
                  transform="translate(0,-28.9)"
                  className="text-white"
                />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#hexagons)" />
          </svg>
          
          {/* Floating circles */}
          <div className="absolute top-20 right-20 w-32 h-32 border-2 border-white/30 rounded-full" />
          <div className="absolute top-40 right-40 w-64 h-64 border border-white/20 rounded-full" />
          <div className="absolute bottom-32 left-20 w-48 h-48 border border-white/20 rounded-full" />
          <div className="absolute -bottom-20 -left-20 w-96 h-96 border-2 border-white/10 rounded-full" />
        </div>

        {/* Content */}
        <div className="relative z-10 h-full">
          <LoginAnnouncementCarousel />
        </div>

        {/* Bottom gradient fade */}
        <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-primary/50 to-transparent pointer-events-none" />
      </section>
    </main>
  );
}
