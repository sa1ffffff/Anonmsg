import { create } from 'zustand';
import type { User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { disconnectSocket } from '../lib/socket';

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

function clearAuthParams() {
  const url = new URL(window.location.href);
  const hasHash =
    url.hash.includes('access_token') ||
    url.hash.includes('refresh_token') ||
    url.hash.includes('error');
  const hasCode = url.searchParams.has('code');
  const hasState = url.searchParams.has('state');
  const hasError = url.searchParams.has('error');

  if (hasHash) url.hash = '';
  if (hasCode) url.searchParams.delete('code');
  if (hasState) url.searchParams.delete('state');
  if (hasError) url.searchParams.delete('error');

  if (hasHash || hasCode || hasState || hasError) {
    const next = `${url.pathname}${url.search}`;
    window.history.replaceState({}, document.title, next);
  }
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

    // Safety net — never stay stuck on loading
    setTimeout(() => {
      if (get().loading) set({ loading: false });
    }, 5000);

    try {
      const url = new URL(window.location.href);
      const code = url.searchParams.get('code');
      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (error) throw error;
      }

      const { data, error } = await supabase.auth.getSession();
      if (error) throw error;
      const session = data.session;

      if (session?.user) {
        try {
          const profile = await ensureProfile(session.user);
          set({ user: session.user, token: session.access_token, profile, loading: false });
        } catch {
          set({ user: session.user, token: session.access_token, profile: null, loading: false });
        }
      } else {
        set({ user: null, token: null, profile: null, loading: false });
      }

      clearAuthParams();
    } catch {
      set({ user: null, token: null, profile: null, loading: false });
    }

    supabase.auth.onAuthStateChange(async (_event, newSession) => {
      if (newSession?.user) {
        try {
          const profile = await ensureProfile(newSession.user);
          set({ user: newSession.user, token: newSession.access_token, profile, loading: false });
        } catch {
          set({ user: newSession.user, token: newSession.access_token, profile: null, loading: false });
        }
      } else {
        set({ user: null, token: null, profile: null, loading: false });
      }
    });
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
    disconnectSocket();
    set({ user: null, token: null, profile: null });
  },
}));