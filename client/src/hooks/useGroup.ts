import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/authStore';
import type { Group } from '../store/groupStore';

interface Member {
  id: string;
  username: string;
  avatar_url: string | null;
  joined_at: string;
}

export function useGroup(groupId?: string) {
  const user = useAuthStore((s) => s.user);
  const [group, setGroup] = useState<Group | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!groupId || !user) return;
    setLoading(true);
    Promise.all([
      supabase
        .from('groups')
        .select('id, name, description, invite_code, created_by')
        .eq('id', groupId)
        .single(),
      supabase
        .from('group_members')
        .select('user_id, joined_at, profiles(id, username, avatar_url)')
        .eq('group_id', groupId)
        .order('joined_at', { ascending: true }),
    ])
      .then(([groupResult, memberResult]) => {
        if (groupResult.error) throw groupResult.error;
        setGroup(groupResult.data as Group);

        if (memberResult.error) throw memberResult.error;
        const mapped =
          memberResult.data?.map((row) => {
            const profile = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles;
            return {
              id: profile?.id ?? row.user_id,
              username: profile?.username ?? 'Member',
              avatar_url: profile?.avatar_url ?? null,
              joined_at: row.joined_at,
            };
          }) ?? [];
        setMembers(mapped);
      })
      .catch(() => {
        setGroup(null);
        setMembers([]);
      })
      .finally(() => setLoading(false));
  }, [groupId, user]);

  return { group, members, loading };
}
