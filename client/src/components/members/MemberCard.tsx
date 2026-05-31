import type { ReactNode } from 'react';
import { formatTimeAgo } from '../../lib/time';

interface MemberCardProps {
  member: {
    id: string;
    username: string;
    avatar_url: string | null;
    joined_at: string;
  };
  action?: ReactNode;
}

export default function MemberCard({ member, action }: MemberCardProps) {
  return (
    <div className="flex items-center justify-between p-3 border border-border-subtle rounded-md hover:bg-bg-hover transition">
      <div className="flex items-center gap-3">
        <div className="relative h-8 w-8 rounded-full bg-bg-elevated overflow-hidden flex items-center justify-center text-xs">
          {member.avatar_url ? (
            <img src={member.avatar_url} alt={member.username} className="h-full w-full object-cover" />
          ) : (
            member.username.slice(0, 2).toUpperCase()
          )}
          <span className="absolute -bottom-0.5 -right-0.5 h-2 w-2 rounded-full bg-emerald-500 border border-bg-subtle" />
        </div>
        <div>
          <div className="text-sm font-medium">{member.username}</div>
          <div className="text-xs font-mono text-text-muted">
            joined {formatTimeAgo(member.joined_at)}
          </div>
        </div>
      </div>
      <div className="flex items-center gap-3">{action}</div>
    </div>
  );
}
