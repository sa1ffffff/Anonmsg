import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useGroupStore } from '../../store/groupStore';
import { useAuthStore } from '../../store/authStore';

interface SidebarProps {
  activeGroupId?: string;
  className?: string;
}

export default function Sidebar({ activeGroupId, className }: SidebarProps) {
  const navigate = useNavigate();
  const token = useAuthStore((s) => s.token);
  const profile = useAuthStore((s) => s.profile);
  const signOut = useAuthStore((s) => s.signOut);
  const groups = useGroupStore((s) => s.groups);
  const loading = useGroupStore((s) => s.loading);
  const fetchGroups = useGroupStore((s) => s.fetchGroups);

  useEffect(() => {
    if (token && groups.length === 0) {
      fetchGroups(token).catch(() => undefined);
    }
  }, [token, groups.length, fetchGroups]);

  const containerClassName =
    className ?? 'hidden lg:flex w-60 flex-col border-r border-border-subtle bg-bg-subtle';

  return (
    <aside className={containerClassName}>
      <div className="p-6 border-b border-border-subtle">
        <div className="flex items-center gap-2">
          <h1 className="text-xs font-display uppercase tracking-[0.12em]">Anonmsg</h1>
          <span className="h-1 w-1 rounded-full bg-accent" />
        </div>
        <p className="text-xs text-text-secondary mt-2">
          Anonymous rooms, real community.
        </p>
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs uppercase tracking-[0.25em] text-text-secondary">
            Rooms
          </span>
          <button
            className="text-xs text-accent hover:brightness-110 transition"
            onClick={() => navigate('/')}
          >
            New
          </button>
        </div>
        {loading && (
          <div className="text-sm text-text-secondary">Loading rooms…</div>
        )}
        {!loading && groups.length === 0 && (
          <div className="text-sm text-text-secondary">
            Create your first room to get started.
          </div>
        )}
        <div className="space-y-2">
          {groups.map((group) => {
            const isActive = group.id === activeGroupId;
            return (
              <button
                key={group.id}
                className={`w-full text-left px-4 py-3 rounded-md border relative transition ${
                  isActive
                    ? 'border-border-strong bg-accent-dim text-text-primary'
                    : 'border-border-subtle text-text-secondary hover:text-text-primary hover:bg-bg-hover'
                }`}
                onClick={() => navigate(`/chat/${group.id}`)}
              >
                {isActive && (
                  <motion.span
                    layoutId="active-group-indicator"
                    className="absolute left-0 top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-full bg-accent"
                  />
                )}
                <div className="font-medium">{group.name}</div>
                <div className="text-xs text-text-muted mt-1 truncate">
                  {group.description || 'No description'}
                </div>
              </button>
            );
          })}
        </div>
      </div>
      <div className="p-4 border-t border-border-subtle flex items-center justify-between">
        <div>
          <div className="text-sm font-medium">{profile?.username ?? 'Anonymous'}</div>
          <div className="text-xs text-text-secondary">Signed in</div>
        </div>
        <button
          className="text-xs text-text-secondary hover:text-text-primary transition"
          onClick={() => signOut()}
        >
          Sign out
        </button>
      </div>
    </aside>
  );
}
