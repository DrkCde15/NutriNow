import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { apiRequest, ApiError } from '../api/client';
import Navbar from '../components/Navbar';
import Icon from '../components/Icon';
import { pexelsImage, handlePexelsError } from '../lib/images';

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

interface WeightPoint { date: string; weight: number }

function WeightChart({ data }: { data: WeightPoint[] }) {
  if (!data || data.length === 0) {
    return <p className="text-muted" style={{ margin: 0 }}>Sem registros de peso ainda.</p>;
  }
  const W = 600, H = 200, pad = 28;
  const weights = data.map(d => d.weight);
  const min = Math.min(...weights);
  const max = Math.max(...weights);
  const range = max - min || 1;
  const n = data.length;
  const x = (i: number) => pad + (i * (W - 2 * pad)) / Math.max(1, n - 1);
  const y = (v: number) => H - pad - ((v - min) / range) * (H - 2 * pad);
  const path = data.map((d, i) => `${i === 0 ? 'M' : 'L'} ${x(i).toFixed(1)} ${y(d.weight).toFixed(1)}`).join(' ');
  const area = `${path} L ${x(n - 1).toFixed(1)} ${H - pad} L ${x(0).toFixed(1)} ${H - pad} Z`;
  const last = data[n - 1];
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="weight-chart" role="img" aria-label="Grafico de evolucao do peso">
      <defs>
        <linearGradient id="wcFill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--primary)" stopOpacity="0.28" />
          <stop offset="100%" stopColor="var(--primary)" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill="url(#wcFill)" />
      <path d={path} fill="none" stroke="var(--primary)" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
      {data.map((d, i) => (
        <circle key={i} cx={x(i)} cy={y(d.weight)} r={i === n - 1 ? 4.5 : 3} fill="var(--card)" stroke="var(--primary)" strokeWidth={2} />
      ))}
      <text x={pad} y={16} className="wc-axis">{min} kg</text>
      <text x={pad} y={H - 8} className="wc-axis">{max} kg</text>
      <text x={W - pad} y={H - 8} textAnchor="end" className="wc-axis">
        {new Date(last.date).toLocaleDateString('pt-BR')}
      </text>
    </svg>
  );
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
              <img className="card-media" src={pexelsImage('body scale weight measurement', 800, 450)} alt="" loading="lazy" onError={(e) => handlePexelsError(e, 'body scale weight measurement', 800, 450)} />
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

            <div className="dash-card" style={{ gridColumn: '1 / -1' }}>
              <h3>Evolução do peso</h3>
              <WeightChart data={data?.weightHistory || []} />
              <div style={{ marginTop: '1rem', overflowX: 'auto' }}>
                <table className="dash-table">
                  <thead>
                    <tr><th>Data</th><th>Peso (kg)</th></tr>
                  </thead>
                  <tbody>
                    {(data?.weightHistory || []).slice().reverse().map((w, i) => (
                      <tr key={i}>
                        <td>{new Date(w.date).toLocaleDateString('pt-BR')}</td>
                        <td>{w.weight}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="dash-card">
              <img className="card-media" src={pexelsImage('workout training gym', 800, 450)} alt="" loading="lazy" onError={(e) => handlePexelsError(e, 'workout training gym', 800, 450)} />
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
              <img className="card-media" src={pexelsImage('nutrition health artificial intelligence', 800, 450)} alt="" loading="lazy" onError={(e) => handlePexelsError(e, 'nutrition health artificial intelligence', 800, 450)} />
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
