import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuthStore } from '../store/authStore';

export default function Login() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const loading = useAuthStore((s) => s.loading);
  const signIn = useAuthStore((s) => s.signIn);
  const signInWithGoogle = useAuthStore((s) => s.signInWithGoogle);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  // If the user is already authenticated (e.g. after OAuth redirect), go home
  if (!loading && user) {
    return <Navigate to="/" replace />;
  }

  const handleLogin = async () => {
    setError(null);
    try {
      await signIn(email, password);
      navigate('/');
    } catch (err) {
      setError((err as Error).message);
    }
  };

  return (
    <motion.div
      className="min-h-screen flex items-center justify-center px-6"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
    >
      <div className="w-full max-w-md">
        <div className="text-center text-xl font-display text-accent mb-6">Anonmsg</div>
        <div className="bg-bg-elevated border border-border-subtle rounded-lg p-8 shadow-soft">
        <h1 className="text-2xl font-display">Welcome back</h1>
        <p className="text-sm text-text-secondary mt-2">Log in to your anonymous rooms.</p>
        {error && <div className="text-sm text-red-400 mt-4">{error}</div>}
        <div className="mt-6 space-y-4">
          <input
            className="w-full bg-bg-elevated border border-border-subtle rounded-md px-4 py-3 text-sm placeholder:text-text-muted focus:border-border-strong focus:shadow-[0_0_0_3px_var(--accent-dim)] transition"
            placeholder="Email"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
          <input
            className="w-full bg-bg-elevated border border-border-subtle rounded-md px-4 py-3 text-sm placeholder:text-text-muted focus:border-border-strong focus:shadow-[0_0_0_3px_var(--accent-dim)] transition"
            placeholder="Password"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
          <button
            className="w-full px-5 py-3 rounded-md bg-accent text-black font-medium hover:brightness-110 transition"
            onClick={handleLogin}
          >
            Log in
          </button>
          <button
            className="w-full px-5 py-3 rounded-md border border-border-subtle text-sm hover:border-accent transition"
            onClick={() => signInWithGoogle().catch((err) => setError((err as Error).message))}
          >
            Continue with Google
          </button>
        </div>
        <div className="mt-6 text-sm text-text-secondary">
          New here?{' '}
          <Link to="/register" className="text-accent hover:text-accent-strong">
            Create an account
          </Link>
        </div>
        </div>
      </div>
    </motion.div>
  );
}
