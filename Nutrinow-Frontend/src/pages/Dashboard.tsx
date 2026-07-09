import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { apiRequest, ApiError } from '../api/client';
import Navbar from '../components/Navbar';
import Icon from '../components/Icon';

interface DashboardProfile {
  name: string;
  height: number;
  weight: number;
  goal: string;
}

interface DashboardData {
  profile: DashboardProfile;
  conversationInsights: string[];
  weightHistory: { date: string; weight: number }[];
  stats: {
    recentPlans: number;
    totalTreinos: number;
  };
}

function initials(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map(p => p[0]?.toUpperCase())
    .join('');
}

export default function Dashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) { navigate('/login', { replace: true }); return; }
    let active = true;
    (async () => {
      try {
        const res = await apiRequest<DashboardData>('/dashboard');
        if (active) setData(res);
      } catch (err) {
        if (err instanceof ApiError && err.status === 401) {
          logout();
          navigate('/login', { replace: true });
          return;
        }
        if (active) setError('Não foi possível carregar o dashboard.');
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, []);

  if (loading) {
    return (
      <main className="page-main">
        <Navbar />
        <div className="loading-screen"><div className="spinner" /></div>
      </main>
    );
  }

  const profile = data?.profile;
  const heightM = profile?.height ? profile.height / 100 : 0;
  const imc = heightM > 0 && profile?.weight ? Math.round((profile.weight / (heightM * heightM)) * 10) / 10 : 0;

  return (
    <main className="page-main">
      <Navbar />

      {error && (
        <div className="alert" role="alert" style={{ margin: '1rem auto', maxWidth: 1200 }}>
          <Icon name="alert" size={16} /> {error}
        </div>
      )}

      {profile && (
        <div className="container" style={{ marginTop: '1.5rem' }}>
          <div className="profile-hero">
            <div className="profile-hero-inner">
              <div className="avatar-wrap">
                <div className="avatar">{initials(profile.name || user?.nome || 'Você')}</div>
              </div>
              <div>
                <h2 style={{ margin: 0 }}>Olá, {profile.name || 'tudo bem?'}</h2>
                <span className="badge" style={{ marginTop: '0.5rem', display: 'inline-flex' }}>
                  <Icon name="star" size={14} /> {profile.goal || 'Sem objetivo definido'}
                </span>
              </div>
            </div>
          </div>

          <div className="dash-grid" style={{ marginTop: '1.5rem' }}>
            <div className="dash-card">
              <h3>Suas medidas</h3>
              <div style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap' }}>
                <div>
                  <div className="stat-value">{profile.weight || '—'}</div>
                  <div className="text-muted" style={{ fontSize: '0.85rem' }}>Peso (kg)</div>
                </div>
                <div>
                  <div className="stat-value">{profile.height || '—'}</div>
                  <div className="text-muted" style={{ fontSize: '0.85rem' }}>Altura (cm)</div>
                </div>
                <div>
                  <div className="stat-value">{imc || '—'}</div>
                  <div className="text-muted" style={{ fontSize: '0.85rem' }}>IMC</div>
                </div>
              </div>
            </div>

            <div className="dash-card">
              <h3>Atividade recente</h3>
              <div style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap' }}>
                <div>
                  <div className="stat-value">{data?.stats.recentPlans ?? 0}</div>
                  <div className="text-muted" style={{ fontSize: '0.85rem' }}>Planos (7 dias)</div>
                </div>
                <div>
                  <div className="stat-value">{data?.stats.totalTreinos ?? 0}</div>
                  <div className="text-muted" style={{ fontSize: '0.85rem' }}>Treinos</div>
                </div>
              </div>
              <div style={{ marginTop: '1rem', display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                <Link to="/dieta-treino" className="btn btn-secondary" style={{ padding: '0.5rem 1rem', fontSize: '0.85rem' }}>Ver dieta e treino</Link>
                <Link to="/calendario" className="btn btn-secondary" style={{ padding: '0.5rem 1rem', fontSize: '0.85rem' }}>Calendário</Link>
              </div>
            </div>

            <div className="dash-card" style={{ gridColumn: '1 / -1' }}>
              <h3>Insights da NutriAI</h3>
              {data?.conversationInsights && data.conversationInsights.length > 0 ? (
                <ul style={{ margin: 0, paddingLeft: '1.1rem', color: 'var(--foreground)', lineHeight: 1.7 }}>
                  {data.conversationInsights.map((insight, i) => (
                    <li key={i}>{insight}</li>
                  ))}
                </ul>
              ) : (
                <p className="text-muted" style={{ margin: 0 }}>
                  Converse com a <Link to="/chat" className="text-primary">NutriAI</Link> para receber insights personalizados.
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      <div style={{ height: '2rem' }} />
    </main>
  );
}
