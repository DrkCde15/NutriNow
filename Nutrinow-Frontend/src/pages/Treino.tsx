import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { apiRequest } from '../api/client';
import Icon from '../components/Icon';

interface TreinoItem {
  id: number;
  title: string;
  description?: string;
  time?: string;
  created_at: string;
  duration_minutes?: number;
}

export default function Treino() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [items, setItems] = useState<TreinoItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) { navigate('/login', { replace: true }); return; }
    loadItems();
  }, []);

  const loadItems = async () => {
    try {
      const res = await apiRequest<{ success: boolean; items: TreinoItem[] }>('/dieta-treino?tipo=treino');
      setItems(res.items || []);
    } catch { /* ok */ }
    setLoading(false);
  };

  const role = user?.role;
  const showPacientes = role === 'nutritionist' || role === 'personal_trainer';

  return (
    <main className="page-main">
      <nav className="navbar">
        <Link to="/" className="brand">
          <span className="brand-logo"><img src="/logo.png" alt="NutriNow" width="32" height="32" /></span>
          <span>Nutri<span className="text-primary">Now</span></span>
        </Link>
        <div className="nav-links">
          <Link to="/chat" className="nav-link">Chat</Link>
          <Link to="/calendario" className="nav-link">Calendário</Link>
          <Link to="/dieta" className="nav-link">Dieta</Link>
          <Link to="/dashboard" className="nav-link">Dashboard</Link>
          {showPacientes && <Link to="/pacientes" className="nav-link">Pacientes</Link>}
          <button className="btn btn-ghost" onClick={logout} style={{ fontSize: '0.85rem' }}><Icon name="logout" size={16} /> Sair</button>
        </div>
      </nav>
      <div className="container" style={{ padding: '2rem 1.5rem', maxWidth: '66rem' }}>
        <h1 style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
          <Icon name="dumbbell" />
          Treinos
        </h1>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '2rem' }}><div className="spinner" /></div>
        ) : items.length === 0 ? (
          <div className="card" style={{ textAlign: 'center', padding: '2rem' }}>
            <Icon name="dumbbell" size={48} style={{ color: 'var(--muted-foreground)' }} />
            <h3 style={{ margin: '1rem 0 0.5rem' }}>Nenhum treino</h3>
            <p className="text-muted">Converse com a NutriAI para criar seu treino personalizado.</p>
            <Link to="/chat" className="btn btn-primary" style={{ marginTop: '1rem' }}><Icon name="message" /> Ir para o Chat</Link>
          </div>
        ) : (
          <div style={{ display: 'grid', gap: '1rem' }}>
            {items.map(item => (
              <div key={item.id} className="card eq">
                <div style={{ flex: 1 }}>
                  <h3 style={{ marginBottom: '0.35rem' }}>{item.title}</h3>
                  {item.description && <p style={{ fontSize: '0.9rem', whiteSpace: 'pre-wrap' }}>{item.description}</p>}
                  <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginTop: '0.5rem' }}>
                    {item.time && <span className="badge badge-outline"><Icon name="clock" size={14} /> {item.time}</span>}
                    {item.duration_minutes && <span className="badge badge-outline">{item.duration_minutes} min</span>}
                  </div>
                </div>
                <p className="text-muted" style={{ fontSize: '0.78rem', marginTop: '0.5rem' }}>
                  Criado em {new Date(item.created_at).toLocaleDateString('pt-BR')}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
