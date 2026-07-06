import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link, Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { apiRequest } from '../../api/client';
import Icon from '../../components/Icon';

interface PatientDetail {
  id: number;
  nome: string;
  email: string;
  altura: number;
  peso: number;
  genero: string;
  meta: string;
  ja_treinou: string;
  dataNascimento: string;
  observacoes: string;
}

export default function PacienteDetalhe() {
  const { id } = useParams();
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [patient, setPatient] = useState<PatientDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [obs, setObs] = useState('');
  const [savingObs, setSavingObs] = useState(false);
  const [obsSaved, setObsSaved] = useState(false);

  useEffect(() => {
    if (!user) { navigate('/login', { replace: true }); return; }
    loadPatient();
  }, []);

  const loadPatient = async () => {
    try {
      const data = await apiRequest<PatientDetail>(`/pacientes/${id}`);
      setPatient(data);
      setObs(data.observacoes || '');
    } catch {
      navigate('/pacientes', { replace: true });
    }
    setLoading(false);
  };

  const saveObs = async () => {
    setSavingObs(true);
    try {
      await apiRequest(`/pacientes/${id}`, { method: 'PUT', body: { observacoes: obs } });
      setObsSaved(true);
      setTimeout(() => setObsSaved(false), 2000);
    } catch { /* */ }
    setSavingObs(false);
  };

  if (user && user.role !== 'nutritionist' && user.role !== 'personal_trainer') {
    return <Navigate to="/dashboard" replace />;
  }

  if (loading) return <div className="loading-screen"><div className="spinner" /></div>;
  if (!patient) return null;

  const bmi = patient.altura > 0 ? patient.peso / (patient.altura * patient.altura) : 0;

  return (
    <main className="page-main">
      <nav className="navbar">
        <Link to="/" className="brand">
          <span className="brand-logo"><img src="/logo.png" alt="NutriNow" width="32" height="32" /></span>
          <span>Nutri<span className="text-primary">Now</span></span>
        </Link>
        <div className="nav-links">
          <Link to="/pacientes" className="nav-link"><Icon name="arrowLeft" size={16} /> Pacientes</Link>
          <Link to="/chat" className="nav-link">Chat</Link>
          <Link to="/calendario" className="nav-link">Calendário</Link>
          <Link to="/dashboard" className="nav-link">Dashboard</Link>
          <button className="btn btn-ghost" onClick={logout} style={{ fontSize: '0.85rem' }}><Icon name="logout" size={16} /> Sair</button>
        </div>
      </nav>
      <div className="container" style={{ padding: '2rem 1.5rem', maxWidth: '66rem' }}>
        <div className="card" style={{ marginBottom: '1.5rem' }}>
          <h1 style={{ margin: '0 0 0.25rem' }}>{patient.nome}</h1>
          <p className="text-muted">{patient.email}</p>
        </div>

        <div className="dash-grid">
          <div className="dash-card">
            <h3>Dados antropométricos</h3>
            <div style={{ display: 'grid', gap: '0.75rem', gridTemplateColumns: '1fr 1fr' }}>
              <div><span className="text-muted">Altura</span><div style={{ fontWeight: 700 }}>{patient.altura.toFixed(2)} m</div></div>
              <div><span className="text-muted">Peso</span><div style={{ fontWeight: 700 }}>{patient.peso.toFixed(1)} kg</div></div>
              <div><span className="text-muted">IMC</span><div style={{ fontWeight: 700 }}>{bmi.toFixed(1)}</div></div>
              <div><span className="text-muted">Gênero</span><div style={{ fontWeight: 700 }}>{patient.genero}</div></div>
            </div>
          </div>
          <div className="dash-card">
            <h3>Informações</h3>
            <p><span className="text-muted">Meta:</span> {patient.meta}</p>
            <p><span className="text-muted">Experiência:</span> {patient.ja_treinou}</p>
            {patient.dataNascimento && <p><span className="text-muted">Nascimento:</span> {new Date(patient.dataNascimento).toLocaleDateString('pt-BR')}</p>}
          </div>
        </div>

        <section className="card" style={{ marginTop: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h3 style={{ margin: 0 }}>Anotações do profissional</h3>
            <Link to={`/pacientes/${id}/anotacoes`} className="btn btn-secondary"><Icon name="bookOpen" /> Ver anotações completas</Link>
          </div>
          {obsSaved && <div className="alert" style={{ marginBottom: '0.5rem', background: 'oklch(0.5 0.2 145 / 0.1)', color: 'oklch(0.4 0.18 145)', borderColor: 'oklch(0.5 0.2 145 / 0.3)' }}><Icon name="check" /> Salvo</div>}
          <textarea className="input textarea" rows={4} value={obs} onChange={e => setObs(e.target.value)} placeholder="Adicione observações sobre este paciente..." />
          <button className="btn btn-primary" style={{ marginTop: '0.75rem' }} onClick={saveObs} disabled={savingObs}>
            {savingObs ? 'Salvando...' : <><Icon name="save" /> Salvar observações</>}
          </button>
        </section>
      </div>
    </main>
  );
}
