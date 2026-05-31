import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuthStore } from '../store/authStore';
import { GroupPreview, useGroupStore } from '../store/groupStore';

export default function Join() {
  const { inviteCode } = useParams();
  const navigate = useNavigate();
  const token = useAuthStore((s) => s.token);
  const signIn = useAuthStore((s) => s.signIn);
  const signInWithGoogle = useAuthStore((s) => s.signInWithGoogle);
  const joinGroup = useGroupStore((s) => s.joinGroup);
  const fetchPreview = useGroupStore((s) => s.fetchGroupPreview);
  const [preview, setPreview] = useState<GroupPreview | null>(null);
  const [loading, setLoading] = useState(true);
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [pendingJoin, setPendingJoin] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!inviteCode) return;
    setLoading(true);
    setError(null);
    fetchPreview(inviteCode)
      .then((data) => setPreview(data))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [inviteCode, fetchPreview]);

  useEffect(() => {
    if (!token || !pendingJoin || !inviteCode) return;
    joinGroup(token, inviteCode)
      .then((group) => navigate(`/chat/${group.id}`))
      .catch((err) => setError(err.message))
      .finally(() => setPendingJoin(false));
  }, [token, pendingJoin, inviteCode, joinGroup, navigate]);

  const handleJoin = () => {
    if (!inviteCode) return;
    if (!token) {
      setPendingJoin(true);
      return;
    }
    joinGroup(token, inviteCode)
      .then((group) => navigate(`/chat/${group.id}`))
      .catch((err) => setError(err.message));
  };

  return (
    <motion.div
      className="min-h-screen px-6 py-12 max-w-4xl mx-auto"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
    >
      <div className="bg-bg-elevated border border-border-subtle rounded-lg p-8 shadow-soft text-center">
        {loading && <div className="text-sm text-text-secondary">Loading invite…</div>}
        {!loading && error && <div className="text-sm text-red-400">{error}</div>}
        {preview && (
          <>
            <h1 className="text-3xl font-display">{preview.name}</h1>
            <p className="text-text-secondary mt-2">{preview.description || 'Private room'}</p>
            <div className="mt-6 flex items-center justify-center gap-4">
              <div className="flex -space-x-2">
                {preview.member_avatars.slice(0, 5).map((member) => (
                  <div
                    key={member.id}
                    className="h-10 w-10 rounded-full border-2 border-bg-elevated overflow-hidden bg-bg-subtle"
                  >
                    {member.avatar_url ? (
                      <img
                        src={member.avatar_url}
                        alt={member.username}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="h-full w-full flex items-center justify-center text-xs">
                        {member.username.slice(0, 2).toUpperCase()}
                      </div>
                    )}
                  </div>
                ))}
              </div>
              <span className="text-sm text-text-muted">
                {preview.member_count} members
              </span>
            </div>
            <div className="mt-8">
              <button
                className="px-6 py-4 rounded-md bg-accent text-black font-medium hover:brightness-110 transition"
                onClick={handleJoin}
              >
                Join room
              </button>
            </div>
          </>
        )}
      </div>

      {!token && (
        <div className="mt-8 bg-bg-elevated border border-border-subtle rounded-lg p-6 shadow-soft">
          <h2 className="text-lg font-display">Log in to join</h2>
          <div className="mt-4 space-y-3">
            <input
              className="w-full bg-bg-elevated border border-border-subtle rounded-md px-4 py-3 text-sm placeholder:text-text-muted focus:border-border-strong focus:shadow-[0_0_0_3px_var(--accent-dim)] transition"
              placeholder="Email"
              type="email"
              value={authEmail}
              onChange={(event) => setAuthEmail(event.target.value)}
            />
            <input
              className="w-full bg-bg-elevated border border-border-subtle rounded-md px-4 py-3 text-sm placeholder:text-text-muted focus:border-border-strong focus:shadow-[0_0_0_3px_var(--accent-dim)] transition"
              placeholder="Password"
              type="password"
              value={authPassword}
              onChange={(event) => setAuthPassword(event.target.value)}
            />
            <button
              className="px-5 py-3 rounded-md bg-accent text-black font-medium hover:brightness-110 transition"
              onClick={() =>
                signIn(authEmail, authPassword).catch((err) => setError((err as Error).message))
              }
            >
              Log in
            </button>
            <button
              className="px-5 py-3 rounded-md border border-border-subtle text-sm hover:border-accent transition"
              onClick={() => signInWithGoogle().catch((err) => setError((err as Error).message))}
            >
              Continue with Google
            </button>
          </div>
        </div>
      )}
    </motion.div>
  );
}
