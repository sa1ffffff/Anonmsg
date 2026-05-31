import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { apiFetch } from '../lib/api';
import { useAuthStore } from '../store/authStore';
import { Group, useGroupStore } from '../store/groupStore';
import Sidebar from '../components/layout/Sidebar';
import ChatWindow from '../components/chat/ChatWindow';
import MemberList from '../components/members/MemberList';

export default function Chat() {
  const { groupId } = useParams();
  const token = useAuthStore((s) => s.token);
  const user = useAuthStore((s) => s.user);
  const fetchGroup = useGroupStore((s) => s.fetchGroup);
  const [group, setGroup] = useState<Group | null>(null);
  const [showMembers, setShowMembers] = useState(false);
  const [showSidebar, setShowSidebar] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (!token || !groupId) return;
    fetchGroup(token, groupId)
      .then((data) => setGroup(data))
      .catch(() => undefined);
  }, [token, groupId, fetchGroup]);

  const regenerateInvite = async () => {
    if (!token || !groupId) return;
    setRefreshing(true);
    try {
      const data = await apiFetch<Group>(`/api/groups/${groupId}/regenerate_invite`, token, {
        method: 'POST',
      });
      setGroup(data);
    } finally {
      setRefreshing(false);
    }
  };

  const inviteLink = group?.invite_code
    ? `${window.location.origin}/join/${group.invite_code}`
    : '';

  return (
    <motion.div
      className="h-screen flex overflow-hidden"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -16 }}
    >
      <Sidebar activeGroupId={groupId} />
      <div className="flex-1 flex flex-col">
        <div className="px-6 py-4 border-b border-border-subtle flex flex-col gap-3 bg-bg-subtle">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-display">{group?.name ?? 'Room'}</h2>
              <p className="text-xs text-text-secondary">
                {group?.description || 'Anonymous discussion space'}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <span className="px-3 py-2 text-xs font-mono border border-border-subtle rounded-full text-text-muted">
                {group?.member_count ?? 0} members
              </span>
              <button
                className="px-3 py-2 text-xs border border-border-subtle rounded-full hover:border-accent transition lg:hidden"
                onClick={() => setShowSidebar(true)}
              >
                Rooms
              </button>
              <button
                className="px-3 py-2 text-xs border border-border-subtle rounded-full hover:border-accent transition"
                onClick={() => setShowMembers(true)}
              >
                Members
              </button>
              {inviteLink && (
                <button
                  className="px-3 py-2 text-xs border border-border-subtle rounded-full hover:border-accent transition"
                  onClick={() => navigator.clipboard.writeText(inviteLink)}
                >
                  Copy invite
                </button>
              )}
              {group?.created_by === user?.id && (
                <button
                  className="px-3 py-2 text-xs border border-border-subtle rounded-full hover:border-accent transition disabled:opacity-50"
                  onClick={regenerateInvite}
                  disabled={refreshing}
                >
                  {refreshing ? 'Refreshing…' : 'Regenerate'}
                </button>
              )}
            </div>
          </div>
          {inviteLink && (
            <div className="text-xs text-text-muted font-mono truncate">
              Invite: {inviteLink}
            </div>
          )}
          <div className="text-xs text-text-muted font-mono">
            Chat is anonymous · Member list is public
          </div>
        </div>
        {groupId && <ChatWindow groupId={groupId} />}
      </div>
      {groupId && (
        <MemberList
          groupId={groupId}
          canRemove={group?.created_by === user?.id}
          currentUserId={user?.id}
        />
      )}

      {showMembers && groupId && (
        <div className="fixed inset-0 bg-black/60 z-40 xl:hidden">
          <button
            className="absolute inset-0"
            aria-label="Close members"
            onClick={() => setShowMembers(false)}
          />
          <div className="absolute right-0 top-0 h-full w-[280px] z-10">
            <MemberList
              groupId={groupId}
              className="flex w-full h-full flex-col border-l border-border-subtle bg-bg-subtle"
              canRemove={group?.created_by === user?.id}
              currentUserId={user?.id}
            />
          </div>
        </div>
      )}

      {showSidebar && (
        <div className="fixed inset-0 bg-black/60 z-40 lg:hidden">
          <button
            className="absolute inset-0"
            aria-label="Close rooms"
            onClick={() => setShowSidebar(false)}
          />
          <div className="absolute left-0 top-0 h-full w-60 z-10">
            <Sidebar
              activeGroupId={groupId}
              className="flex w-full h-full flex-col border-r border-border-subtle bg-bg-subtle"
            />
          </div>
        </div>
      )}
    </motion.div>
  );
}
