import { Router } from 'express';
import crypto from 'crypto';
import { authenticate } from '../middleware/authenticate.js';
import { supabase } from '../lib/supabase.js';

const router = Router();

function generateInviteCode() {
  return crypto.randomBytes(6).toString('hex');
}

async function ensureMember(groupId: string, userId: string) {
  const { data } = await supabase
    .from('group_members')
    .select('user_id')
    .eq('group_id', groupId)
    .eq('user_id', userId)
    .single();
  return Boolean(data);
}

router.get('/invite/:inviteCode', async (req, res) => {
  const { inviteCode } = req.params;
  const { data: group, error: groupError } = await supabase
    .from('groups')
    .select('id, name, description')
    .eq('invite_code', inviteCode)
    .single();

  if (groupError || !group) return res.status(404).json({ error: 'Invalid invite' });

  const { count, error: countError } = await supabase
    .from('group_members')
    .select('*', { count: 'exact', head: true })
    .eq('group_id', group.id);

  if (countError) return res.status(500).json({ error: 'Failed to load members' });

  const { data: members, error: membersError } = await supabase
    .from('group_members')
    .select('profiles(id, username, avatar_url)')
    .eq('group_id', group.id)
    .limit(6);

  if (membersError) return res.status(500).json({ error: 'Failed to load members' });

  const memberAvatars =
    members
      ?.map((member) =>
        Array.isArray(member.profiles) ? member.profiles[0] : member.profiles,
      )
      .filter(Boolean)
      .map((profile) => ({
        id: profile!.id,
        username: profile!.username,
        avatar_url: profile!.avatar_url,
      })) ?? [];

  return res.json({
    ...group,
    member_count: count ?? 0,
    member_avatars: memberAvatars,
  });
});

router.post('/', authenticate, async (req, res) => {
  const { name, description } = req.body ?? {};
  if (!name?.trim()) return res.status(400).json({ error: 'Name required' });

  const inviteCode = generateInviteCode();
  const { data, error } = await supabase
    .from('groups')
    .insert({
      name: name.trim(),
      description: description?.trim() || null,
      created_by: req.user.id,
      invite_code: inviteCode,
    })
    .select()
    .single();

  if (error || !data) {
    return res.status(500).json({
      error: error?.message ?? 'Failed to create group',
      code: error?.code ?? 'unknown',
    });
  }

  const { error: memberError } = await supabase
    .from('group_members')
    .insert({ group_id: data.id, user_id: req.user.id });
  if (memberError) {
    return res.status(500).json({
      error: memberError.message ?? 'Failed to add member',
      code: memberError.code ?? 'unknown',
    });
  }
  return res.json(data);
});

router.post('/join/:inviteCode', authenticate, async (req, res) => {
  const { inviteCode } = req.params;

  const { data: group, error: groupError } = await supabase
    .from('groups')
    .select('id, name, description, invite_code, created_by')
    .eq('invite_code', inviteCode)
    .single();

  if (groupError || !group) return res.status(404).json({ error: 'Invalid invite' });

  const { error } = await supabase
    .from('group_members')
    .insert({ group_id: group.id, user_id: req.user.id });

  if (error?.code === '23505') return res.status(200).json({ message: 'Already a member', group });
  if (error) return res.status(500).json({ error: 'Failed to join' });

  return res.json({ message: 'Joined', group });
});

router.get('/', authenticate, async (req, res) => {
  const { data, error } = await supabase
    .from('group_members')
    .select('group_id, groups(id, name, description, invite_code, created_by)')
    .eq('user_id', req.user.id);
  if (error) return res.status(500).json({ error: 'Failed to load groups' });
  return res.json(data?.map((d) => d.groups) ?? []);
});

router.get('/:groupId', authenticate, async (req, res) => {
  const { groupId } = req.params;
  const isMember = await ensureMember(groupId, req.user.id);
  if (!isMember) return res.status(403).json({ error: 'Not a member' });

  const { data: group, error: groupError } = await supabase
    .from('groups')
    .select('id, name, description, invite_code, created_by')
    .eq('id', groupId)
    .single();

  if (groupError || !group) return res.status(404).json({ error: 'Group not found' });

  const { count, error: countError } = await supabase
    .from('group_members')
    .select('*', { count: 'exact', head: true })
    .eq('group_id', groupId);

  if (countError) return res.status(500).json({ error: 'Failed to load members' });
  return res.json({ ...group, member_count: count ?? 0 });
});

router.post('/:groupId/regenerate_invite', authenticate, async (req, res) => {
  const { groupId } = req.params;

  const { data: group, error: groupError } = await supabase
    .from('groups')
    .select('id, created_by')
    .eq('id', groupId)
    .single();

  if (groupError || !group) return res.status(404).json({ error: 'Group not found' });
  if (group.created_by !== req.user.id) return res.status(403).json({ error: 'Forbidden' });

  const inviteCode = generateInviteCode();
  const { data: updated, error: updateError } = await supabase
    .from('groups')
    .update({ invite_code: inviteCode })
    .eq('id', groupId)
    .select('id, name, description, invite_code, created_by')
    .single();

  if (updateError || !updated) return res.status(500).json({ error: 'Failed to update invite' });
  return res.json(updated);
});

router.get('/:groupId/messages', authenticate, async (req, res) => {
  const { groupId } = req.params;
  const { before, limit = 50 } = req.query;

  const isMember = await ensureMember(groupId, req.user.id);
  if (!isMember) return res.status(403).json({ error: 'Not a member' });

  let query = supabase
    .from('messages')
    .select('id, content, alias, sent_at')
    .eq('group_id', groupId)
    .order('sent_at', { ascending: false })
    .limit(Number(limit));

  if (before) query = query.lt('sent_at', before);

  const { data: messages, error: messagesError } = await query;
  if (messagesError) return res.status(500).json({ error: 'Failed to load messages' });
  const messageIds = messages?.map((message) => message.id) ?? [];

  const reactionsMap: Record<string, Record<string, number>> = {};
  if (messageIds.length > 0) {
    const { data: reactions, error: reactionsError } = await supabase
      .from('reactions')
      .select('message_id, emoji, count')
      .in('message_id', messageIds);

    if (reactionsError) return res.status(500).json({ error: 'Failed to load reactions' });
    reactions?.forEach((reaction) => {
      if (!reactionsMap[reaction.message_id]) {
        reactionsMap[reaction.message_id] = {};
      }
      reactionsMap[reaction.message_id][reaction.emoji] = reaction.count;
    });
  }

  return res.json(
    (messages ?? []).map((message) => ({
      ...message,
      reactions: reactionsMap[message.id] ?? {},
    })),
  );
});

export default router;
