import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { apiRequest } from '../api/client';
import Navbar from '../components/Navbar';
import Icon from '../components/Icon';

interface RoutineItem {
  id: number;
  title: string;
  description?: string;
  time?: string;
  tipo: string;
  created_at: string;
  duration_minutes?: number;
}

type Aba = 'dieta' | 'treino';

export default function Rotina() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [aba, setAba] = useState<Aba>('dieta');
  const [dietas, setDietas] = useState<RoutineItem[]>([]);
  const [treinos, setTreinos] = useState<RoutineItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!user) { navigate('/', { replace: true }); return; }
    loadAll();
  }, [user]);

  const loadAll = async () => {
    setLoading(true);
    setError(false);
    try {
      const [d, t] = await Promise.all([
        apiRequest<{ success: boolean; items: RoutineItem[] }>('/dieta-treino?tipo=dieta'),
        apiRequest<{ success: boolean; items: RoutineItem[] }>('/dieta-treino?tipo=treino'),
      ]);
      setDietas(d.items || []);
      setTreinos(t.items || []);
    } catch {
      setError(true);
    }
    setLoading(false);
  };

  const items = aba === 'dieta' ? dietas : treinos;

  return (
    <main className="page-main">
      <Navbar />
      <div className="container" style={{ padding: '2rem 1.5rem', maxWidth: '66rem' }}>
        <div className="tabs" style={{ marginBottom: '1.5rem' }}>
          <button className={`tab ${aba === 'dieta' ? 'active' : ''}`} onClick={() => setAba('dieta')}>
            <Icon name="leaf" size={16} /> Dieta
          </button>
          <button className={`tab ${aba === 'treino' ? 'active' : ''}`} onClick={() => setAba('treino')}>
            <Icon name="dumbbell" size={16} /> Treino
          </button>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '2rem' }}><div className="spinner" /></div>
        ) : error ? (
          <div className="card" style={{ textAlign: 'center', padding: '2rem' }}>
            <Icon name="alertCircle" size={48} style={{ color: 'var(--muted-foreground)' }} />
            <h3 style={{ margin: '1rem 0 0.5rem' }}>Não foi possível carregar</h3>
            <p className="text-muted">Ocorreu um erro ao buscar seus planos. Tente novamente.</p>
            <button className="btn btn-secondary" style={{ marginTop: '1rem' }} onClick={loadAll}>
              <Icon name="refresh" /> Tentar novamente
            </button>
          </div>
        ) : items.length === 0 ? (
          <div className="card" style={{ textAlign: 'center', padding: '2rem' }}>
            <Icon name={aba === 'dieta' ? 'leaf' : 'dumbbell'} size={48} style={{ color: 'var(--muted-foreground)' }} />
            <h3 style={{ margin: '1rem 0 0.5rem' }}>{aba === 'dieta' ? 'Nenhum plano alimentar' : 'Nenhum treino'}</h3>
            <p className="text-muted">
              Converse com a NutriAI para criar {aba === 'dieta' ? 'seu plano alimentar' : 'seu treino'} personalizado.
            </p>
            <Link to="/chat" className="btn btn-primary" style={{ marginTop: '1rem' }}>
              <Icon name="message" /> Ir para o Chat
            </Link>
          </div>
        ) : (
          <div style={{ display: 'grid', gap: '1rem' }}>
            {items.map(item => (
              <div key={item.id} className="card">
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
