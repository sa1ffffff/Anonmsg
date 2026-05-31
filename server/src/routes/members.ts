import { Router } from 'express';
import { authenticate } from '../middleware/authenticate.js';
import { supabase } from '../lib/supabase.js';

const router = Router();

async function ensureMember(groupId: string, userId: string) {
  const { data } = await supabase
    .from('group_members')
    .select('user_id')
    .eq('group_id', groupId)
    .eq('user_id', userId)
    .single();
  return Boolean(data);
}

router.get('/:groupId', authenticate, async (req, res) => {
  const { groupId } = req.params;
  const isMember = await ensureMember(groupId, req.user.id);
  if (!isMember) return res.status(403).json({ error: 'Not a member' });

  const { data, error } = await supabase
    .from('group_members')
    .select('user_id, joined_at, profiles(id, username, avatar_url)')
    .eq('group_id', groupId)
    .order('joined_at', { ascending: true });

  if (error) return res.status(500).json({ error: 'Failed to load members' });
  const members =
    data?.map((row) => {
      const profile = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles;
      return {
        id: profile?.id ?? row.user_id,
        username: profile?.username ?? 'Member',
        avatar_url: profile?.avatar_url ?? null,
        joined_at: row.joined_at,
      };
    }) ?? [];

  return res.json(members);
});

router.delete('/:groupId/:memberId', authenticate, async (req, res) => {
  const { groupId, memberId } = req.params;

  const { data: group, error: groupError } = await supabase
    .from('groups')
    .select('id, created_by')
    .eq('id', groupId)
    .single();

  if (groupError || !group) return res.status(404).json({ error: 'Group not found' });
  if (group.created_by !== req.user.id) return res.status(403).json({ error: 'Forbidden' });

  await supabase
    .from('group_members')
    .delete()
    .eq('group_id', groupId)
    .eq('user_id', memberId);

  return res.json({ message: 'Removed' });
});

export default router;
