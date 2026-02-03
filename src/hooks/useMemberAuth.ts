import { useState, useEffect, createContext, useContext, createElement } from 'react';
import type { ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

interface MemberProfile {
  member_id: string;
  company_id: string;
  contact_name: string;
  contact_number: string;
  contact_email: string | null;
  status: string;
  fitness_plan_name: string | null;
  expiration_date: string | null;
}

interface MemberAuthContextType {
  user: User | null;
  session: Session | null;
  memberProfile: MemberProfile | null;
  loading: boolean;
  isMember: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
}

const MemberAuthContext = createContext<MemberAuthContextType | undefined>(undefined);

export function MemberAuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [memberProfile, setMemberProfile] = useState<MemberProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isMember, setIsMember] = useState(false);

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session);
      setUser(session?.user ?? null);

      if (session?.user) {
        const userEmail = session.user.email ?? null;
        setTimeout(() => {
          fetchMemberProfile(session.user.id, userEmail);
        }, 0);
      } else {
        setMemberProfile(null);
        setIsMember(false);
      }
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);

      if (session?.user) {
        fetchMemberProfile(session.user.id, session.user.email ?? null);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchMemberProfile = async (userId: string, userEmail?: string | null) => {
    const { data, error } = await supabase.rpc('get_member_for_user', { _user_id: userId });

    if (!error && data && data.length > 0) {
      setMemberProfile(data[0] as MemberProfile);
      setIsMember(true);
      return;
    }

    // If not linked yet, try to auto-link by email (active contract required)
    if (userEmail) {
      const { data: linked, error: linkError } = await supabase.rpc('link_user_to_member', {
        p_user_id: userId,
        p_member_email: userEmail,
      });

      if (!linkError && linked) {
        const { data: linkedData, error: linkedFetchError } = await supabase.rpc('get_member_for_user', { _user_id: userId });

        if (!linkedFetchError && linkedData && linkedData.length > 0) {
          setMemberProfile(linkedData[0] as MemberProfile);
          setIsMember(true);
          return;
        }
      }
    }

    setMemberProfile(null);
    setIsMember(false);
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { error };
  };

  const signUp = async (email: string, password: string) => {
    // First, check if the email belongs to a member with active contract
    const { data: canRegister } = await supabase.rpc('can_member_register_portal', {
      member_email: email,
    });

    if (!canRegister) {
      return {
        error: new Error('Este e-mail não está vinculado a nenhum aluno com contrato ativo.'),
      };
    }

    const portalRedirectUrl = `${window.location.origin}/aluno`;
    const recoveryRedirectUrl = `${window.location.origin}/aluno/redefinir-senha`;

    // Try to create auth account
    const { data: authData, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: portalRedirectUrl,
      },
    });

    // Handle "User already registered" error
    if (signUpError?.message?.includes('already registered') || signUpError?.message?.includes('already been registered')) {
      const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError) {
        const msg = (signInError.message || '').toLowerCase();

        // Not confirmed yet → resend confirmation
        if (msg.includes('email not confirmed') || msg.includes('not confirmed')) {
          const { error: resendError } = await supabase.auth.resend({ type: 'signup', email });

          return {
            error: resendError
              ? new Error('Seu e-mail ainda não foi confirmado. Tente novamente em alguns minutos.')
              : new Error('Seu e-mail ainda não foi confirmado. Reenviamos a confirmação. Verifique sua caixa de entrada (e spam).'),
          };
        }

        // Wrong password → trigger password recovery
        if (msg.includes('invalid login credentials')) {
          const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
            redirectTo: recoveryRedirectUrl,
          });

          return {
            error: resetError
              ? new Error('Este e-mail já possui conta, mas não foi possível enviar o link de redefinição. Tente novamente.')
              : new Error('Este e-mail já possui conta. Enviamos um link para você criar/alterar sua senha. Verifique sua caixa de entrada (e spam).'),
          };
        }

        return {
          error: new Error('Não foi possível acessar esta conta. Use "Esqueci minha senha" ou fale com a academia.'),
        };
      }

      // User signed in - check if member link exists, if not create it
      if (signInData.user) {
        const { data: memberData } = await supabase.rpc('get_member_for_user', {
          _user_id: signInData.user.id,
        });

        if (!memberData || memberData.length === 0) {
          await supabase.rpc('link_user_to_member', {
            p_user_id: signInData.user.id,
            p_member_email: email,
          });
        }
      }

      return { error: null };
    }

    if (signUpError) {
      return { error: signUpError };
    }

    // If user was created, link to member using security definer function
    if (authData.user) {
      const { data: linked, error: linkError } = await supabase.rpc('link_user_to_member', {
        p_user_id: authData.user.id,
        p_member_email: email,
      });

      if (linkError || !linked) {
        console.error('Error linking user to member:', linkError);
        // Account was created but linking failed - user will see "access restricted"
      }
    }

    return { error: null };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setMemberProfile(null);
    setIsMember(false);
  };

  const value: MemberAuthContextType = {
    user,
    session,
    memberProfile,
    loading,
    isMember,
    signIn,
    signUp,
    signOut,
  };

  return createElement(MemberAuthContext.Provider, { value }, children);
}

export function useMemberAuth() {
  const context = useContext(MemberAuthContext);
  if (context === undefined) {
    throw new Error('useMemberAuth must be used within a MemberAuthProvider');
  }
  return context;
}