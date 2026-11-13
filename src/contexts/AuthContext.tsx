import React, { createContext, useCallback, useEffect, useState } from 'react';
import { isSupabaseConfigured, supabase } from '../lib/supabase';
import {
  getSessionState,
  loginWithEmail,
  logout as authLogout,
  registerShopOwner,
  sendPasswordReset as authSendPasswordReset,
  type AuthResult,
} from '../services/authService';
import type { Profile, RegistrationInput, Shop } from '../types/database';

export interface AuthContextValue {
  profile: Profile | null;
  shop: Shop | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  register: (input: RegistrationInput) => Promise<AuthResult>;
  login: (email: string, password: string) => Promise<AuthResult>;
  logout: () => Promise<void>;
  sendPasswordReset: (email: string) => Promise<void>;
  refreshSession: () => Promise<void>;
  setShop: React.Dispatch<React.SetStateAction<Shop | null>>;
}

export const AuthContext = createContext<AuthContextValue | null>(null);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [shop, setShop] = useState<Shop | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const refreshSession = useCallback(async () => {
    try {
      const state = await getSessionState();
      setProfile(state.profile);
      setShop(state.shop);
    } catch {
      setProfile(null);
      setShop(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;

    const init = async () => {
      try {
        const state = await getSessionState();
        if (!active) return;
        setProfile(state.profile);
        setShop(state.shop);
      } catch {
        if (!active) return;
        setProfile(null);
        setShop(null);
      } finally {
        if (active) setIsLoading(false);
      }
    };

    void init();

    if (isSupabaseConfigured && supabase) {
      const {
        data: { subscription },
      } = supabase.auth.onAuthStateChange((event) => {
        if (event === 'SIGNED_OUT') {
          setProfile(null);
          setShop(null);
          setIsLoading(false);
        } else if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED') {
          void refreshSession();
        }
      });

      return () => {
        active = false;
        subscription.unsubscribe();
      };
    }

    return () => {
      active = false;
    };
  }, [refreshSession]);

  const register = useCallback(async (input: RegistrationInput): Promise<AuthResult> => {
    const result = await registerShopOwner(input);
    if (!result.requiresEmailConfirmation) {
      setProfile(result.profile);
      setShop(result.shop);
    }
    return result;
  }, []);

  const login = useCallback(async (email: string, password: string): Promise<AuthResult> => {
    const result = await loginWithEmail(email, password);
    setProfile(result.profile);
    setShop(result.shop);
    return result;
  }, []);

  const logout = useCallback(async (): Promise<void> => {
    await authLogout();
    setProfile(null);
    setShop(null);
  }, []);

  const sendPasswordReset = useCallback(async (email: string): Promise<void> => {
    await authSendPasswordReset(email);
  }, []);

  const value: AuthContextValue = {
    profile,
    shop,
    isAuthenticated: Boolean(profile),
    isLoading,
    register,
    login,
    logout,
    sendPasswordReset,
    refreshSession,
    setShop,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
