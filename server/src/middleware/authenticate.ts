import type { NextFunction, Request, Response } from 'express';
import type { User } from '@supabase/supabase-js';
import crypto from 'crypto';
import { supabase } from '../lib/supabase.js';

function baseUsername(user: User) {
  const raw =
    (user.user_metadata?.username as string | undefined) ??
    user.email?.split('@')[0] ??
    'user';
  const trimmed = raw.trim();
  return trimmed || 'user';
}

function avatarUrl(user: User) {
  return (
    (user.user_metadata?.avatar_url as string | undefined) ??
    (user.user_metadata?.picture as string | undefined) ??
    null
  );
}

async function ensureProfile(user: User) {
  const { data: existing, error: existingError } = await supabase
    .from('profiles')
    .select('id')
    .eq('id', user.id)
    .maybeSingle();

  if (existingError) {
    return { ok: false, error: 'Failed to load profile' as const };
  }
  if (existing) {
    return { ok: true as const };
  }

  const base = baseUsername(user);
  const avatar = avatarUrl(user);
  let candidate = base;

  for (let attempt = 0; attempt < 5; attempt += 1) {
    const { data: nameTaken, error: nameError } = await supabase
      .from('profiles')
      .select('id')
      .eq('username', candidate)
      .maybeSingle();

    if (nameError) {
      return { ok: false, error: 'Failed to check username' as const };
    }

    if (nameTaken) {
      candidate = `${base}-${crypto.randomInt(1000, 9999)}`;
      continue;
    }

    const { error: insertError } = await supabase.from('profiles').insert({
      id: user.id,
      username: candidate,
      avatar_url: avatar,
    });

    if (!insertError) {
      return { ok: true as const };
    }

    if (insertError.code === '23505') {
      candidate = `${base}-${crypto.randomInt(1000, 9999)}`;
      continue;
    }

    return { ok: false, error: 'Failed to create profile' as const };
  }

  return { ok: false, error: 'Failed to create unique username' as const };
}

export async function authenticate(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  const token = header?.startsWith('Bearer ') ? header.slice(7) : undefined;

  if (!token) {
    return res.status(401).json({ error: 'Missing token' });
  }

  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data.user) {
    return res.status(401).json({ error: 'Invalid token' });
  }

  const ensured = await ensureProfile(data.user);
  if (!ensured.ok) {
    return res.status(500).json({ error: ensured.error });
  }

  req.user = data.user;
  return next();
}
