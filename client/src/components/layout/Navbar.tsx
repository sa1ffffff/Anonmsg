import { useNavigate } from 'react-router-dom';

interface NavbarProps {
  title?: string;
}

export default function Navbar({ title }: NavbarProps) {
  const navigate = useNavigate();
  return (
    <div className="w-full flex items-center justify-between px-6 py-4 border-b border-border-subtle bg-bg-subtle">
      <div className="flex items-center gap-2">
        <span className="text-xs font-display uppercase tracking-[0.12em]">Anonmsg</span>
        <span className="h-1 w-1 rounded-full bg-accent" />
      </div>
      {title && <div className="text-sm text-text-secondary">{title}</div>}
      <button
        className="text-xs text-text-secondary hover:text-text-primary transition"
        onClick={() => navigate('/')}
      >
        Home
      </button>
    </div>
  );
}
