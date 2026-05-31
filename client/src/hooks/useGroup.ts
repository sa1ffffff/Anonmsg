import { useEffect, useState } from 'react';
import { apiFetch } from '../lib/api';
import { useAuthStore } from '../store/authStore';
import type { Group } from '../store/groupStore';

interface Member {
  id: string;
  username: string;
  avatar_url: string | null;
  joined_at: string;
}

export function useGroup(groupId?: string) {
  const token = useAuthStore((s) => s.token);
  const [group, setGroup] = useState<Group | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!groupId || !token) return;
    setLoading(true);
    Promise.all([
      apiFetch<Group>(`/api/groups/${groupId}`, token),
      apiFetch<Member[]>(`/api/members/${groupId}`, token),
    ])
      .then(([groupData, memberData]) => {
        setGroup(groupData);
        setMembers(memberData);
      })
      .finally(() => setLoading(false));
  }, [groupId, token]);

  return { group, members, loading };
}
