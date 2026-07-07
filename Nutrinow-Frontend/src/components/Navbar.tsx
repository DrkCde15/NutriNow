import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Icon from './Icon';

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
            <Link to="/dashboard" className="nav-link">Dashboard</Link>
            <Link to="/calendario" className="nav-link">Calendário</Link>
            <Link to="/dieta" className="nav-link">Dieta</Link>
            <Link to="/treino" className="nav-link">Treino</Link>
            <Link to="/chat" className="nav-link">Chat</Link>
            <Link to="/perfil" className="nav-link">Perfil</Link>
            {showPacientes && <Link to="/pacientes" className="nav-link">Pacientes</Link>}
            <Link to="/feedbacks" className="nav-link">Feedbacks</Link>
            <button className="btn btn-ghost" onClick={logout} style={{ fontSize: '0.85rem' }}><Icon name="logout" size={16} /> Sair</button>
          </>
        ) : (
          <>
            <Link to="/login" className="nav-link">Entrar</Link>
            <Link to="/cadastro" className="btn btn-primary" style={{ padding: '0.5rem 1.2rem', fontSize: '0.85rem' }}>Criar conta</Link>
          </>
        )}
      </div>
    </nav>
  );
}