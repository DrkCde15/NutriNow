import { useNavigate } from 'react-router-dom';

interface NavLinkProps {
  to: string;
  className?: string;
  children: React.ReactNode;
  onClick?: () => void;
  style?: React.CSSProperties;
}

export default function NavLink({ to, className, children, onClick, style }: NavLinkProps) {
  const navigate = useNavigate();
  return (
    <button
      type="button"
      className={className}
      style={style}
      onClick={() => { navigate(to); onClick?.(); }}
    >
      {children}
    </button>
  );
}
