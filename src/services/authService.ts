import { isSupabaseConfigured, supabase } from '../lib/supabase';
import type { Profile, RegistrationInput, Shop } from '../types/database';
import { logAppError, normalizeAppError } from '../utils/errorHandling';
import { normalizeWhatsappNumber, slugifyShopName } from '../utils/validation';
import {
  localGetSessionState,
  localLoginWithEmail,
  localLogout,
  localRegisterShopOwner,
} from './localPreviewStore';

export interface AuthResult {
  profile: Profile | null;
  shop: Shop | null;
  requiresEmailConfirmation?: boolean;
}

async function fetchProfileAndShopForUser(userId: string): Promise<{
  profile: Profile | null;
  shop: Shop | null;
}> {
  if (!supabase) {
    return { profile: null, shop: null };
  }

  const [{ data: profileData, error: profileError }, { data: shopData, error: shopError }] =
    await Promise.all([
      supabase.from('profiles').select('*').eq('id', userId).maybeSingle(),
      supabase.from('shops').select('*').eq('owner_id', userId).maybeSingle(),
    ]);

  if (profileError) {
    throw new Error(profileError.message);
  }
  if (shopError) {
    throw new Error(shopError.message);
  }

  return {
    profile: (profileData as Profile | null) ?? null,
    shop: (shopData as Shop | null) ?? null,
  };
}

export async function getSessionState(): Promise<{
  profile: Profile | null;
  shop: Shop | null;
}> {
  if (!isSupabaseConfigured || !supabase) {
    const local = localGetSessionState();
    return local ?? { profile: null, shop: null };
  }

  const {
    data: { session },
    error,
  } = await supabase.auth.getSession();

  if (error || !session?.user) {
    return { profile: null, shop: null };
  }

  const { profile, shop } = await fetchProfileAndShopForUser(session.user.id);

  // If the user confirmed email after signup and the shop wasn't created yet by trigger,
  // finalize shop creation securely via the server-side RPC using auth.uid().
  if (!shop && session.user.user_metadata?.shop_name && session.user.user_metadata?.shop_slug) {
    const meta = session.user.user_metadata;
    const { data: rpcShop, error: rpcError } = await supabase.rpc(
      'create_shop_for_authenticated_user',
      {
        p_name: String(meta.shop_name),
        p_slug: String(meta.shop_slug),
        p_category: String(meta.shop_category || 'General Retail'),
        p_whatsapp_number: String(meta.whatsapp_number || ''),
        p_full_name: meta.full_name ? String(meta.full_name) : null,
      }
    );

    if (!rpcError && rpcShop) {
      const refreshed = await fetchProfileAndShopForUser(session.user.id);
      return {
        profile: refreshed.profile,
        shop: rpcShop as Shop,
      };
    }
  }

  return { profile, shop };
}

export async function registerShopOwner(input: RegistrationInput): Promise<AuthResult> {
  if (!isSupabaseConfigured || !supabase) {
    const result = await localRegisterShopOwner(input);
    return {
      profile: result.profile,
      shop: result.shop,
      requiresEmailConfirmation: false,
    };
  }

  const cleanEmail = input.email.trim().toLowerCase();
  const cleanSlug = slugifyShopName(input.shopSlug);
  const cleanWhatsapp = normalizeWhatsappNumber(input.whatsappNumber);

  // Verify platform registration availability
  const { data: settingsRow } = await supabase
    .from('platform_settings')
    .select('allow_new_registrations')
    .eq('id', 1)
    .maybeSingle();

  if (settingsRow && settingsRow.allow_new_registrations === false) {
    throw new Error('New shop registrations are currently paused by platform administration.');
  }

  // Check slug availability before creating auth user
  const { data: slugAvailable, error: slugErr } = await supabase.rpc('is_shop_slug_available', {
    p_slug: cleanSlug,
  });

  if (slugErr) {
    logAppError('registerShopOwner.slugCheck', slugErr);
    throw new Error('Could not verify shop slug availability. Please try again.');
  }
  if (slugAvailable === false) {
    throw new Error('This shop slug is already taken. Please choose another unique slug.');
  }

  const { data, error } = await supabase.auth.signUp({
    email: cleanEmail,
    password: input.password,
    options: {
      emailRedirectTo: `${window.location.origin}/dashboard`,
      data: {
        full_name: input.fullName.trim(),
        shop_name: input.shopName.trim(),
        shop_slug: cleanSlug,
        shop_category: input.shopCategory.trim(),
        whatsapp_number: cleanWhatsapp,
      },
    },
  });

  if (error) {
    logAppError('registerShopOwner.signUp', error);
    throw new Error(normalizeAppError(error, 'Unable to register shop account.'));
  }

  if (!data.user) {
    throw new Error('Registration did not return a user account.');
  }

  // If email confirmation is required by the Supabase project, no active session is returned yet.
  if (!data.session) {
    return {
      profile: null,
      shop: null,
      requiresEmailConfirmation: true,
    };
  }

  // Ensure profile + shop exist atomically via server-side auth.uid() RPC
  const { data: createdShop, error: rpcError } = await supabase.rpc(
    'create_shop_for_authenticated_user',
    {
      p_name: input.shopName.trim(),
      p_slug: cleanSlug,
      p_category: input.shopCategory.trim(),
      p_whatsapp_number: cleanWhatsapp,
      p_full_name: input.fullName.trim(),
    }
  );

  if (rpcError) {
    throw new Error(rpcError.message);
  }

  const { profile, shop } = await fetchProfileAndShopForUser(data.user.id);
  return {
    profile,
    shop: shop ?? (createdShop as Shop),
    requiresEmailConfirmation: false,
  };
}

export async function loginWithEmail(email: string, password: string): Promise<AuthResult> {
  if (!isSupabaseConfigured || !supabase) {
    const result = await localLoginWithEmail(email, password);
    return {
      profile: result.profile,
      shop: result.shop,
    };
  }

  const { data, error } = await supabase.auth.signInWithPassword({
    email: email.trim().toLowerCase(),
    password,
  });

  if (error) {
    logAppError('loginWithEmail', error);
    throw new Error(normalizeAppError(error, 'Unable to sign in. Check your credentials.'));
  }

  if (!data.user) {
    throw new Error('Unable to establish session.');
  }

  const state = await getSessionState();
  return {
    profile: state.profile,
    shop: state.shop,
  };
}

export async function logout(): Promise<void> {
  if (!isSupabaseConfigured || !supabase) {
    localLogout();
    return;
  }

  const { error } = await supabase.auth.signOut();
  if (error) {
    throw new Error(error.message);
  }
}

export async function sendPasswordReset(email: string): Promise<void> {
  const cleanEmail = email.trim().toLowerCase();
  if (!isSupabaseConfigured || !supabase) {
    // In local preview mode, validate email and confirm instruction without fake network calls
    return;
  }

  const { error } = await supabase.auth.resetPasswordForEmail(cleanEmail, {
    redirectTo: `${window.location.origin}/login`,
  });

  if (error) {
    throw new Error(error.message);
  }
}
