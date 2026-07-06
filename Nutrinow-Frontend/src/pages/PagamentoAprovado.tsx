import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { apiRequest } from '../api/client';
import Icon from '../components/Icon';

export default function PagamentoAprovado() {
  const { user, refreshMe, isPremium } = useAuth();
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    if (!isPremium) handleRefresh();
  }, []);

  const handleRefresh = async () => {
    setChecking(true);
    await refreshMe();
    setChecking(false);
  };

  return (
    <main className="page-main">
      <nav className="navbar">
        <Link to="/" className="brand">
          <span className="brand-logo"><img src="/logo.png" alt="NutriNow" width="32" height="32" /></span>
          <span>Nutri<span className="text-primary">Now</span></span>
        </Link>
        <div className="nav-links">
          {user && <Link to="/chat" className="nav-link">Chat</Link>}
          {!user && <Link to="/login" className="nav-link">Login</Link>}
        </div>
      </nav>
      <div className="container" style={{ padding: '4rem 1rem', textAlign: 'center', maxWidth: '36rem' }}>
        <Icon name="checkCircle" size={64} style={{ color: 'var(--primary)' }} />
        <h1 style={{ margin: '1.5rem 0 1rem' }}>Pagamento confirmado!</h1>

        {!user ? (
          <>
            <p className="text-muted">Faça login com a mesma conta que usou no pagamento para ativar o Premium.</p>
            <Link to="/login" className="btn btn-primary" style={{ marginTop: '1rem' }}><Icon name="login" /> Fazer login</Link>
          </>
        ) : isPremium ? (
          <>
            <div className="alert alert-success" style={{ justifyContent: 'center', marginBottom: '1rem' }}>
              <Icon name="checkCircle" /> Sua conta já está Premium!
            </div>
            <div className="inline-actions" style={{ justifyContent: 'center', marginTop: '1.5rem' }}>
              <Link to="/dashboard" className="btn btn-primary"><Icon name="activity" /> Acessar Dashboard</Link>
              <Link to="/chat" className="btn btn-secondary"><Icon name="message" /> Conversar com NutriAI</Link>
            </div>
          </>
        ) : (
          <>
            <p className="text-muted">Estamos aguardando a confirmação do pagamento. Pode levar alguns instantes.</p>
            <button className="btn btn-primary" onClick={handleRefresh} disabled={checking} style={{ marginTop: '1rem' }}>
              <Icon name="refresh" /> {checking ? 'Verificando...' : 'Verificar status'}
            </button>
          </>
        )}

        <div style={{ marginTop: '3rem', display: 'flex', flexDirection: 'column', gap: '0.75rem', textAlign: 'left' }}>
          <h3>O que acontece agora?</h3>
          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
            <span style={{ background: 'var(--primary)', color: 'white', width: '1.5rem', height: '1.5rem', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem', fontWeight: 800, flexShrink: 0 }}>1</span>
            <p>Pagamento confirmado pela Cakto</p>
          </div>
          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
            <span style={{ background: 'var(--primary)', color: 'white', width: '1.5rem', height: '1.5rem', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem', fontWeight: 800, flexShrink: 0 }}>2</span>
            <p>Sua conta é liberada automaticamente</p>
          </div>
          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
            <span style={{ background: 'var(--primary)', color: 'white', width: '1.5rem', height: '1.5rem', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem', fontWeight: 800, flexShrink: 0 }}>3</span>
            <p>Acesso a dashboard, dietas, treinos e calendário</p>
          </div>
        </div>
      </div>
    </main>
  );
}
