import { useState, useEffect } from 'react';
import { useNavigate, Link, Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { apiRequest } from '../../api/client';
import Icon from '../../components/Icon';
import Navbar from '../../components/Navbar';

interface Patient {
  id: number;
  nome: string;
  email?: string;
  ultima_interacao?: string;
  criado_em?: string;
  planos_ativos?: number;
  objetivo?: string;
}

export default function Pacientes() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) { navigate('/', { replace: true }); return; }
    loadPatients();
  }, [user]);

  const loadPatients = async () => {
    try {
      const data = await apiRequest<{ patients?: Patient[] }>('/patients');
      setPatients(Array.isArray(data?.patients) ? data.patients : []);
    } catch { /* ok */ }
    setLoading(false);
  };

  if (user && user.role !== 'nutritionist' && user.role !== 'personal_trainer') {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <main className="page-main">
      <Navbar />
      <div className="container" style={{ padding: '2rem 1.5rem', maxWidth: '66rem' }}>
        <h1 style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
          <Icon name="users" />
          Meus Pacientes
        </h1>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '2rem' }}><div className="spinner" /></div>
        ) : patients.length === 0 ? (
          <div className="card" style={{ textAlign: 'center', padding: '2rem' }}>
            <Icon name="users" size={48} style={{ color: 'var(--muted-foreground)' }} />
            <h3 style={{ margin: '1rem 0 0.5rem' }}>Nenhum paciente</h3>
            <p className="text-muted">Quando você aceitar pacientes, eles aparecerão aqui.</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gap: '1rem' }}>
            {patients.map(p => (
              <Link key={p.id} to={`/pacientes/${p.id}`} className="card eq" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
                <div>
                  <div style={{ fontWeight: 700 }}>{p.nome}</div>
                  <div className="text-muted" style={{ fontSize: '0.85rem' }}>{p.email || p.objetivo || 'Paciente'}</div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  {typeof p.planos_ativos === 'number' && <span className="badge badge-outline">{p.planos_ativos} planos ativos</span>}
                  {(p.ultima_interacao || p.criado_em) && <span className="text-muted" style={{ fontSize: '0.78rem' }}>Desde: {new Date(p.ultima_interacao || p.criado_em!).toLocaleDateString('pt-BR')}</span>}
                  <Icon name="arrowRight" size={18} style={{ color: 'var(--muted-foreground)' }} />
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
