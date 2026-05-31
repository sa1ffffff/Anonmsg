import { create } from 'zustand';
import type { User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

interface Profile {
  id: string;
  username: string;
  avatar_url: string | null;
}

interface AuthStore {
  user: User | null;
  profile: Profile | null;
  token: string | null;
  loading: boolean;
  initialized: boolean;
  init: () => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, username: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
}

function normalizeUsername(value: string): string {
  const cleaned = value
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, '')
    .slice(0, 20);
  return cleaned || `user${Math.floor(Math.random() * 10000)}`;
}

function deriveUsername(user: User): string {
  const metadataName =
    (user.user_metadata?.username as string | undefined) ||
    (user.user_metadata?.full_name as string | undefined) ||
    (user.user_metadata?.name as string | undefined);
  if (metadataName) return normalizeUsername(metadataName);

  const emailPrefix = user.email?.split('@')[0] ?? '';
  return normalizeUsername(emailPrefix || `user${user.id.slice(0, 6)}`);
}

async function ensureProfile(user: User, preferredUsername?: string) {
  const { data: existing, error: readError } = await supabase
    .from('profiles')
    .select('id, username, avatar_url')
    .eq('id', user.id)
    .single();

  if (!readError && existing?.username) return existing as Profile;

  const base = preferredUsername || deriveUsername(user);
  const avatar = (user.user_metadata?.avatar_url as string | undefined) ?? null;

  for (let i = 0; i < 3; i += 1) {
    const username =
      i === 0
        ? base
        : normalizeUsername(`${base}${Math.floor(Math.random() * 1000)}`);
    const { data, error } = await supabase
      .from('profiles')
      .upsert({ id: user.id, username, avatar_url: avatar }, { onConflict: 'id' })
      .select('id, username, avatar_url')
      .single();

    if (!error && data) return data as Profile;
    if (error?.code !== '23505') {
      throw error;
    }
  }

  throw new Error('Unable to set username');
}

export const useAuthStore = create<AuthStore>((set, get) => ({
  user: null,
  profile: null,
  token: null,
  loading: true,
  initialized: false,

  init: async () => {
    if (get().initialized) return;
    set({ loading: true, initialized: true });

    // Set up auth state listener FIRST so we catch the session from OAuth callback.
    // Supabase SDK with detectSessionInUrl:true + flowType:'pkce' automatically
    // detects ?code= in the URL, exchanges it, and fires this callback.
    supabase.auth.onAuthStateChange(async (event, newSession) => {
      if (newSession?.user) {
        set({ user: newSession.user, token: newSession.access_token, loading: false });
        ensureProfile(newSession.user)
          .then((profile) => set({ profile }))
          .catch(() => {});
      } else if (event === 'SIGNED_OUT') {
        set({ user: null, token: null, profile: null, loading: false });
      }
    });

    try {
      // getSession() will also trigger the SDK to process any ?code= or #access_token=
      // in the URL if it hasn't already.
      const { data, error } = await supabase.auth.getSession();
      if (error) throw error;
      const session = data.session;

      if (session?.user) {
        set({ user: session.user, token: session.access_token, profile: null, loading: false });
        // Load profile in background
        ensureProfile(session.user)
          .then((profile) => set({ profile }))
          .catch(() => {});
      } else {
        set({ user: null, token: null, profile: null, loading: false });
      }
    } catch {
      set({ user: null, token: null, profile: null, loading: false });
    }
  },

  signIn: async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    if (data.session?.user) {
      const profile = await ensureProfile(data.session.user);
      set({ user: data.session.user, token: data.session.access_token, profile });
    }
  },

  signUp: async (email, password, username) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { username } },
    });
    if (error) throw error;
    if (data.user) {
      await ensureProfile(data.user, username);
    }
  },

  signInWithGoogle: async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin },
    });
    if (error) throw error;
  },

  signOut: async () => {
    await supabase.auth.signOut();
    set({ user: null, token: null, profile: null });
  },
}));