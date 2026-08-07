import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import NavLink from './NavLink';
import Icon from './Icon';
import NotificacaoBell from './NotificacaoBell';

export default function Navbar() {
  const { user, logout } = useAuth();
  const role = user?.role;
  const showPacientes = role === 'nutritionist' || role === 'personal_trainer';
  return (
    <nav className="navbar">
      <Link to="/" className="brand">
        <span className="brand-logo"><img src="/logo.png" alt="NutriNow" width="32" height="32" /></span>
        <span>Nutri<span className="text-primary">Now</span></span>
      </Link>
      <div className="nav-links">
        {user ? (
          <>
            <NavLink to="/dashboard" className="nav-link">Dashboard</NavLink>
            <NavLink to="/calendario" className="nav-link">Calendário</NavLink>
            <NavLink to="/dieta-treino" className="nav-link">Dieta-Treino</NavLink>
            <NavLink to="/chat" className="nav-link">Chat</NavLink>
            <NavLink to="/academias" className="nav-link">Academias</NavLink>
            <NavLink to="/perfil" className="nav-link">Perfil</NavLink>
            {showPacientes && <NavLink to="/pacientes" className="nav-link">Pacientes</NavLink>}
            {showPacientes && <NavLink to="/convidar" className="nav-link">Convidar</NavLink>}

            <NotificacaoBell />

            <button className="btn btn-ghost" onClick={logout} style={{ fontSize: '0.85rem' }}><Icon name="logout" size={16} /> Sair</button>
          </>
        ) : (
          <>
            <NavLink to="/login" className="nav-link">Entrar</NavLink>
            <Link to="/cadastro" className="btn btn-primary" style={{ padding: '0.5rem 1.2rem', fontSize: '0.85rem' }}>Criar conta</Link>
          </>
        )}
      </div>
    </nav>
  );
}

