import { useNavigate, useLocation } from 'react-router-dom';

interface NavLinkProps {
  to: string;
  className?: string;
  children: React.ReactNode;
  onClick?: () => void;
  style?: React.CSSProperties;
}

export default function NavLink({ to, className, children, onClick, style }: NavLinkProps) {
  const navigate = useNavigate();
  const { pathname } = useLocation();

  const isActive =
    to === '/'
      ? pathname === '/'
      : pathname === to || pathname.startsWith(`${to}/`);

  const classes = [className, isActive ? 'active' : ''].filter(Boolean).join(' ');

  return (
    <button
      type="button"
      className={classes}
      style={style}
      aria-current={isActive ? 'page' : undefined}
      onClick={() => { navigate(to); onClick?.(); }}
    >
      {children}
    </button>
  );
}
