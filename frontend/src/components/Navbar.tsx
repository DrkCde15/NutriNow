import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import NavLink from './NavLink';
import Icon from './Icon';
import NotificacaoBell from './NotificacaoBell';

export default function Navbar() {
  const { user, logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const role = user?.role;
  const showPacientes = role === 'nutritionist' || role === 'personal_trainer';
  const fechar = () => setMenuOpen(false);

  useEffect(() => {
    if (!menuOpen) return;
    const handler = (e: PointerEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) fechar();
    };
    document.addEventListener('pointerdown', handler);
    return () => document.removeEventListener('pointerdown', handler);
  }, [menuOpen]);

  useEffect(() => {
    if (menuOpen) {
      document.body.style.overflow = 'hidden';
      return () => { document.body.style.overflow = ''; };
    }
  }, [menuOpen]);

  const links = user ? (
    <>
      <NavLink to="/dashboard" className="nav-link" onClick={fechar}>Dashboard</NavLink>
      <NavLink to="/calendario" className="nav-link" onClick={fechar}>Calendário</NavLink>
      <NavLink to="/dieta-treino" className="nav-link" onClick={fechar}>Dieta-Treino</NavLink>
      <NavLink to="/chat" className="nav-link" onClick={fechar}>Chat</NavLink>
      <NavLink to="/academias" className="nav-link" onClick={fechar}>Academias</NavLink>
      <NavLink to="/perfil" className="nav-link" onClick={fechar}>Perfil</NavLink>
      {showPacientes && <NavLink to="/pacientes" className="nav-link" onClick={fechar}>Pacientes</NavLink>}
      {showPacientes && <NavLink to="/convidar" className="nav-link" onClick={fechar}>Convidar</NavLink>}

      <NotificacaoBell />

      <button
        className="btn btn-ghost"
        onClick={() => { logout(); fechar(); }}
        style={{ fontSize: '0.85rem' }}
      >
        <Icon name="logout" size={16} /> Sair
      </button>
    </>
  ) : (
    <>
      <NavLink to="/login" className="nav-link" onClick={fechar}>Entrar</NavLink>
      <Link
        to="/cadastro"
        className="btn btn-primary"
        onClick={fechar}
        style={{ padding: '0.5rem 1.2rem', fontSize: '0.85rem' }}
      >
        Criar conta
      </Link>
    </>
  );

  return (
    <div className="navbar-wrap" ref={menuRef}>
      <nav className="navbar">
        <Link to="/" className="brand" onClick={fechar}>
          <span className="brand-logo"><img src="/logo.png" alt="NutriNow" width="32" height="32" /></span>
          <span>Nutri<span className="text-primary">Now</span></span>
        </Link>

        <div className="nav-links">{links}</div>

        <button
          className="icon-btn navbar-menu-btn"
          onClick={() => setMenuOpen(o => !o)}
          aria-label={menuOpen ? 'Fechar menu' : 'Abrir menu'}
          aria-expanded={menuOpen}
          aria-controls="nav-drawer"
        >
          <Icon name={menuOpen ? 'x' : 'menu'} size={20} />
        </button>
      </nav>

      {menuOpen && (
        <div className="nav-overlay" onClick={fechar} aria-hidden />
      )}

      <aside
        id="nav-drawer"
        className={`nav-drawer ${menuOpen ? 'open' : ''}`}
        aria-hidden={!menuOpen}
        inert={!menuOpen}
      >
        <div className="nav-drawer-header">
          <Link to="/" className="brand" onClick={fechar}>
            <span className="brand-logo"><img src="/logo.png" alt="NutriNow" width="32" height="32" /></span>
            <span>Nutri<span className="text-primary">Now</span></span>
          </Link>
          <button
            className="icon-btn"
            onClick={fechar}
            aria-label="Fechar menu"
          >
            <Icon name="x" size={18} />
          </button>
        </div>
        <div className="nav-drawer-links">{links}</div>
      </aside>
    </div>
  );
}