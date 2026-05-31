import { Router } from 'express';
import { authenticate } from '../middleware/authenticate.js';
import { supabase } from '../lib/supabase.js';

const router = Router();

router.get('/me', authenticate, async (req, res) => {
  const { data } = await supabase
    .from('profiles')
    .select('id, username, avatar_url')
    .eq('id', req.user.id)
    .single();

  return res.json(data);
});

router.put('/me', authenticate, async (req, res) => {
  const { username, avatar_url } = req.body ?? {};
  if (!username?.trim()) return res.status(400).json({ error: 'Username required' });

  const { data, error } = await supabase
    .from('profiles')
    .update({ username: username.trim(), avatar_url: avatar_url ?? null })
    .eq('id', req.user.id)
    .select('id, username, avatar_url')
    .single();

  if (error) return res.status(500).json({ error: 'Failed to update profile' });
  return res.json(data);
});

export default router;
