import { useEffect, useState } from 'react';
import { apiFetch } from '../../lib/api';
import { useAuthStore } from '../../store/authStore';
import MemberCard from './MemberCard';

interface Member {
  id: string;
  username: string;
  avatar_url: string | null;
  joined_at: string;
}

interface MemberListProps {
  groupId: string;
  className?: string;
  canRemove?: boolean;
  currentUserId?: string;
}

export default function MemberList({
  groupId,
  className,
  canRemove,
  currentUserId,
}: MemberListProps) {
  const token = useAuthStore((s) => s.token);
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    setLoading(true);
    apiFetch<Member[]>(`/api/members/${groupId}`, token)
      .then((data) => setMembers(data))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [groupId, token]);

  const removeMember = async (memberId: string) => {
    if (!token) return;
    setRemovingId(memberId);
    setError(null);
    try {
      await apiFetch(`/api/members/${groupId}/${memberId}`, token, { method: 'DELETE' });
      setMembers((current) => current.filter((member) => member.id !== memberId));
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setRemovingId(null);
    }
  };

  const containerClassName =
    className ?? 'hidden xl:flex w-[280px] flex-col border-l border-border-subtle bg-bg-subtle';

  return (
    <aside className={containerClassName}>
      <div className="p-6 border-b border-border-subtle">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-display uppercase tracking-[0.08em] text-text-secondary">
            Members
          </h2>
          <span className="text-xs font-mono text-text-muted">{members.length}</span>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {loading && <div className="text-sm text-text-secondary">Loading members…</div>}
        {!loading && error && <div className="text-xs text-red-400">{error}</div>}
        {!loading &&
          members.map((member) => (
            <MemberCard
              key={member.id}
              member={member}
              action={
                canRemove && member.id !== currentUserId ? (
                  <button
                    className="text-xs text-text-muted hover:text-red-400 transition"
                    onClick={() => removeMember(member.id)}
                    disabled={removingId === member.id}
                  >
                    {removingId === member.id ? 'Removing…' : 'Remove'}
                  </button>
                ) : null
              }
            />
          ))}
      </div>
    </aside>
  );
}
