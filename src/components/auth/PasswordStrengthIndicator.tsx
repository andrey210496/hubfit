import { useMemo } from 'react';
import { cn } from '@/lib/utils';
import { Check, X, Shield, ShieldCheck, ShieldAlert } from 'lucide-react';

interface PasswordStrengthIndicatorProps {
  password: string;
  className?: string;
}

interface PasswordRequirement {
  label: string;
  met: boolean;
}

export function PasswordStrengthIndicator({ password, className }: PasswordStrengthIndicatorProps) {
  const requirements: PasswordRequirement[] = useMemo(() => [
    { label: 'Mínimo 8 caracteres', met: password.length >= 8 },
    { label: 'Letra maiúscula', met: /[A-Z]/.test(password) },
    { label: 'Letra minúscula', met: /[a-z]/.test(password) },
    { label: 'Número', met: /[0-9]/.test(password) },
    { label: 'Caractere especial (!@#$%^&*)', met: /[!@#$%^&*(),.?":{}|<>]/.test(password) },
  ], [password]);

  const strength = useMemo(() => {
    const metCount = requirements.filter(r => r.met).length;
    if (metCount === 0) return { level: 0, label: '', color: '' };
    if (metCount <= 2) return { level: 1, label: 'Fraca', color: 'text-red-500' };
    if (metCount <= 3) return { level: 2, label: 'Média', color: 'text-yellow-500' };
    if (metCount <= 4) return { level: 3, label: 'Boa', color: 'text-blue-500' };
    return { level: 4, label: 'Forte', color: 'text-green-500' };
  }, [requirements]);

  const getStrengthIcon = () => {
    switch (strength.level) {
      case 1:
        return <ShieldAlert className={cn("w-4 h-4", strength.color)} />;
      case 2:
      case 3:
        return <Shield className={cn("w-4 h-4", strength.color)} />;
      case 4:
        return <ShieldCheck className={cn("w-4 h-4", strength.color)} />;
      default:
        return null;
    }
  };

  if (!password) return null;

  return (
    <div className={cn("space-y-3 animate-fade-in", className)}>
      {/* Strength Bar */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">Força da senha</span>
          {strength.level > 0 && (
            <div className="flex items-center gap-1.5">
              {getStrengthIcon()}
              <span className={cn("text-xs font-medium", strength.color)}>
                {strength.label}
              </span>
            </div>
          )}
        </div>
        <div className="flex gap-1">
          {[1, 2, 3, 4].map((level) => (
            <div
              key={level}
              className={cn(
                "h-1.5 flex-1 rounded-full transition-all duration-300",
                "bg-border/50",
                level <= strength.level && [
                  strength.level === 1 && "bg-red-500",
                  strength.level === 2 && "bg-yellow-500",
                  strength.level === 3 && "bg-blue-500",
                  strength.level === 4 && "bg-green-500",
                ]
              )}
            />
          ))}
        </div>
      </div>

      {/* Requirements List */}
      <div className="grid grid-cols-1 gap-1.5">
        {requirements.map((req, index) => (
          <div
            key={index}
            className={cn(
              "flex items-center gap-2 text-xs transition-all duration-200",
              req.met ? "text-green-500" : "text-muted-foreground"
            )}
          >
            <div className={cn(
              "w-4 h-4 rounded-full flex items-center justify-center transition-all duration-200",
              req.met 
                ? "bg-green-500/20" 
                : "bg-muted/50"
            )}>
              {req.met ? (
                <Check className="w-3 h-3" />
              ) : (
                <X className="w-3 h-3 opacity-50" />
              )}
            </div>
            <span>{req.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// Helper function to validate password strength for form submission
export function validatePasswordStrength(password: string): { isValid: boolean; message: string } {
  const hasMinLength = password.length >= 8;
  const hasUppercase = /[A-Z]/.test(password);
  const hasLowercase = /[a-z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);

  const metCount = [hasMinLength, hasUppercase, hasLowercase, hasNumber, hasSpecialChar].filter(Boolean).length;

  if (metCount < 3) {
    return {
      isValid: false,
      message: 'Senha muito fraca. Use pelo menos 8 caracteres com letras maiúsculas, minúsculas e números.',
    };
  }

  return { isValid: true, message: '' };
}
