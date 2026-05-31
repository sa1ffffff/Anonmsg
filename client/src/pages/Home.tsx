import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuthStore } from '../store/authStore';
import { useGroupStore } from '../store/groupStore';

export default function Home() {
  const navigate = useNavigate();
  const token = useAuthStore((s) => s.token);
  const profile = useAuthStore((s) => s.profile);
  const groups = useGroupStore((s) => s.groups);
  const loading = useGroupStore((s) => s.loading);
  const fetchGroups = useGroupStore((s) => s.fetchGroups);
  const createGroup = useGroupStore((s) => s.createGroup);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [invite, setInvite] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (token) {
      fetchGroups(token).catch(() => undefined);
    }
  }, [token, fetchGroups]);

  const handleCreate = async () => {
    if (!token || !name.trim()) return;
    setSaving(true);
    try {
      const group = await createGroup(token, { name: name.trim(), description: description.trim() });
      setName('');
      setDescription('');
      navigate(`/chat/${group.id}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <motion.div
      className="min-h-screen px-8 py-10 max-w-6xl mx-auto"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
    >
      <header className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-display">Welcome back, {profile?.username ?? 'friend'}.</h1>
          <p className="text-text-secondary mt-2">
            Create a room, share the invite, and talk without the labels.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <input
            className="bg-bg-elevated border border-border-subtle rounded-md px-3 py-2 text-xs placeholder:text-text-muted"
            placeholder="Invite code"
            value={invite}
            onChange={(event) => setInvite(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && invite.trim()) {
                navigate(`/join/${invite.trim()}`);
              }
            }}
          />
          <button
            className="text-xs text-accent hover:text-accent-strong transition"
            onClick={() => invite && navigate(`/join/${invite.trim()}`)}
          >
            Join
          </button>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-[1.1fr_0.9fr] gap-8">
        <section className="bg-bg-elevated border border-border-subtle rounded-lg p-6 shadow-soft">
          <h2 className="text-lg font-display">Create a new room</h2>
          <p className="text-sm text-text-secondary mt-2">
            You become the admin and can regenerate invites or remove members.
          </p>
          <div className="mt-6 space-y-4">
            <input
              className="w-full bg-bg-elevated border border-border-subtle rounded-md px-4 py-3 text-sm placeholder:text-text-muted"
              placeholder="Room name"
              value={name}
              onChange={(event) => setName(event.target.value)}
            />
            <textarea
              className="w-full bg-bg-elevated border border-border-subtle rounded-md px-4 py-3 text-sm min-h-[100px] placeholder:text-text-muted"
              placeholder="Description (optional)"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
            />
            <button
              className="px-5 py-3 rounded-md bg-accent text-black font-medium hover:brightness-110 transition disabled:opacity-50"
              onClick={handleCreate}
              disabled={saving || !name.trim()}
            >
              {saving ? 'Creating…' : 'Create room'}
            </button>
          </div>
        </section>

        <section className="bg-bg-elevated border border-border-subtle rounded-lg p-6 shadow-soft">
          <h2 className="text-lg font-display">Your rooms</h2>
          <p className="text-sm text-text-secondary mt-2">
            Jump back into the conversations you’re hosting or attending.
          </p>
          <div className="mt-6 space-y-3">
            {loading && <div className="text-sm text-text-secondary">Loading rooms…</div>}
            {!loading && groups.length === 0 && (
              <div className="text-sm text-text-secondary">No rooms yet. Create one to start.</div>
            )}
            {groups.map((group) => (
              <motion.button
                key={group.id}
                className="w-full text-left border border-border-subtle rounded-md p-4 hover:border-border-strong transition"
                onClick={() => navigate(`/chat/${group.id}`)}
                whileHover={{ y: -2 }}
              >
                <div className="font-medium">{group.name}</div>
                <div className="text-xs text-text-secondary mt-1">
                  {group.description || 'No description'}
                </div>
              </motion.button>
            ))}
          </div>
        </section>
      </div>
    </motion.div>
  );
}
