import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { apiRequest } from '../api/client';
import Icon from '../components/Icon';

interface DashboardData {
  profile: { name: string; height: number; weight: number; goal: string };
  conversationInsights: { date: string; activity: string; status: string }[];
  weightHistory: { date: string; weight: number | null; activityLevel: number }[];
  stats: { recentPlans: number; totalTreinos: number };
}

const BMI_CATEGORIES = [
  { min: 0, max: 18.49, label: 'Abaixo do peso', color: '#60a5fa' },
  { min: 18.5, max: 24.9, label: 'Peso normal', color: '#22c55e' },
  { min: 25, max: 29.9, label: 'Sobrepeso', color: '#facc15' },
  { min: 30, max: 34.9, label: 'Obesidade I', color: '#fb923c' },
  { min: 35, max: Infinity, label: 'Obesidade II+', color: '#ef4444' },
];

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!user) { navigate('/login', { replace: true }); return; }
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const d = await apiRequest<DashboardData>('/dashboard');
      setData(d);
    } catch (err: any) {
      setError(err.message || 'Erro ao carregar');
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="loading-screen"><div className="spinner" /></div>;

  const profile = data?.profile;
  if (!profile) return <div className="loading-screen"><p className="text-muted">Nenhum dado encontrado.</p></div>;

  const bmi = profile.height > 0 ? profile.weight / (profile.height * profile.height) : 0;
  const bmiCat = BMI_CATEGORIES.find(c => bmi >= c.min && bmi <= c.max) || BMI_CATEGORIES[1];
  const insights = data?.conversationInsights || [];
  const history = data?.weightHistory || [];
  const stats = data?.stats || { recentPlans: 0, totalTreinos: 0 };

  return (
    <main className="page-main">
      <Navbar />
      <div className="container" style={{ padding: '2rem 1.5rem', maxWidth: '66rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h1 style={{ margin: 0 }}>Olá, {profile.name.split(' ')[0]}!</h1>
            <p className="text-muted" style={{ marginTop: '0.25rem' }}>Aqui está seu resumo de hoje.</p>
          </div>
          <Link to="/perfil" className="btn btn-secondary"><Icon name="edit" /> Editar perfil</Link>
        </div>

        {error && <div className="alert" style={{ marginBottom: '1rem' }}><Icon name="alert" /> {error}</div>}

        <div className="dash-grid">
          <div className="dash-card">
            <h3>Seu perfil</h3>
            <div style={{ display: 'grid', gap: '0.75rem', gridTemplateColumns: '1fr 1fr' }}>
              <div><span className="text-muted">Altura</span><div style={{ fontWeight: 700 }}>{profile.height.toFixed(2)} m</div></div>
              <div><span className="text-muted">Peso</span><div style={{ fontWeight: 700 }}>{profile.weight.toFixed(1)} kg</div></div>
              <div><span className="text-muted">IMC</span><div style={{ fontWeight: 700 }}>{bmi.toFixed(1)}</div></div>
              <div><span className="text-muted">Categoria</span><div style={{ fontWeight: 700, color: bmiCat.color }}>{bmiCat.label}</div></div>
            </div>
            <div style={{ marginTop: '0.75rem' }}>
              <span className="text-muted">Meta:</span>
              <div style={{ fontWeight: 600 }}>{profile.goal}</div>
            </div>
          </div>

          <div className="dash-card">
            <h3>Estatísticas</h3>
            <div style={{ display: 'grid', gap: '0.75rem', gridTemplateColumns: '1fr 1fr' }}>
              <div>
                <div className="stat-value">{stats.recentPlans}</div>
                <span className="text-muted">Planos (7 dias)</span>
              </div>
              <div>
                <div className="stat-value">{stats.totalTreinos}</div>
                <span className="text-muted">Total de treinos</span>
              </div>
            </div>
          </div>
        </div>

        <div className="dash-grid" style={{ marginTop: '1.5rem' }}>
          <div className="dash-card">
            <h3>Atividades recentes</h3>
            {insights.length === 0 ? (
              <p className="text-muted">Nenhuma atividade registrada ainda.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {insights.map((item, i) => (
                  <div key={i} style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start', padding: '0.5rem 0', borderBottom: '1px solid var(--border)' }}>
                    <span style={{
                      width: '2rem', height: '2rem', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                      background: item.status === 'positive' ? 'oklch(0.5 0.2 145 / 0.1)' : item.status === 'alert' ? 'oklch(0.6 0.22 27 / 0.1)' : 'var(--surface)',
                      color: item.status === 'positive' ? 'oklch(0.4 0.18 145)' : item.status === 'alert' ? 'var(--destructive)' : 'var(--muted-foreground)',
                      fontSize: '0.8rem', fontWeight: 700, flexShrink: 0
                    }}>
                      {item.status === 'positive' ? <Icon name="check" size={14} /> : item.status === 'alert' ? <Icon name="alert" size={14} /> : <Icon name="activity" size={14} />}
                    </span>
                    <div>
                      <div style={{ fontSize: '0.85rem', fontWeight: 600 }}>{item.activity}</div>
                      <div className="text-muted" style={{ fontSize: '0.78rem' }}>{item.date}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="dash-card">
            <h3>Histórico de peso</h3>
            <svg viewBox="0 0 280 120" style={{ width: '100%', height: 'auto' }}>
              <polyline
                fill="none" stroke="var(--primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                points={history.map((h, i) => {
                  const x = (i / Math.max(history.length - 1, 1)) * 260 + 10;
                  const y = 100 - (h.activityLevel / 100) * 80;
                  return `${x},${y}`;
                }).join(' ')}
              />
              {history.map((h, i) => {
                const x = (i / Math.max(history.length - 1, 1)) * 260 + 10;
                const y = 100 - (h.activityLevel / 100) * 80;
                return <circle key={i} cx={x} cy={y} r="3" fill="var(--primary)" />;
              })}
            </svg>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: 'var(--muted-foreground)' }}>
              {history.map((h, i) => <span key={i}>{h.date}</span>)}
            </div>
          </div>
        </div>

        <div style={{ marginTop: '2rem', textAlign: 'center' }}>
          <Link to="/calendario" className="btn btn-primary"><Icon name="calendar" /> Ver calendário completo</Link>
        </div>
      </div>
    </main>
  );
}

function Navbar() {
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
        <Link to="/chat" className="nav-link">Chat</Link>
        <Link to="/calendario" className="nav-link">Calendário</Link>
        <Link to="/dieta" className="nav-link">Dieta</Link>
        <Link to="/treino" className="nav-link">Treino</Link>
        {showPacientes && <Link to="/pacientes" className="nav-link">Pacientes</Link>}
        <Link to="/feedbacks" className="nav-link">Feedbacks</Link>
        <button className="btn btn-ghost" onClick={logout} style={{ fontSize: '0.85rem' }}><Icon name="logout" size={16} /> Sair</button>
      </div>
    </nav>
  );
}
