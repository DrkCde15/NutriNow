import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link, Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { apiRequest } from '../../api/client';
import Icon from '../../components/Icon';
import Navbar from '../../components/Navbar';

interface PatientDetail {
  id: number;
  nome: string;
  idade?: number;
  altura?: number;
  peso?: number;
  objetivo?: string;
  observacoes?: string;
  criado_em?: string;
}

export default function PacienteDetalhe() {
  const { id } = useParams();
  const { user } = useAuth();
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
      const data = await apiRequest<{ patient?: PatientDetail }>(`/patients/${id}`);
      if (data.patient) {
        setPatient(data.patient);
        setObs(data.patient.observacoes || '');
      } else {
        navigate('/pacientes', { replace: true });
      }
    } catch {
      navigate('/pacientes', { replace: true });
    }
    setLoading(false);
  };

  const saveObs = async () => {
    setSavingObs(true);
    try {
      await apiRequest(`/patients/${id}`, { method: 'PUT', body: { observacoes: obs } });
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

  const alturaNum = Number(patient.altura) || 0;
  const pesoNum = Number(patient.peso) || 0;
  const bmi = alturaNum > 0 ? pesoNum / (alturaNum * alturaNum) : 0;

  return (
    <main className="page-main">
      <Navbar />
      <div className="container" style={{ padding: '2rem 1.5rem', maxWidth: '66rem' }}>
        <div className="card" style={{ marginBottom: '1.5rem' }}>
          <h1 style={{ margin: '0 0 0.25rem' }}>{patient.nome}</h1>
          <p className="text-muted">{patient.idade ? `${patient.idade} anos` : 'Paciente'}</p>
        </div>

        <div className="dash-grid">
          <div className="dash-card">
            <h3>Dados antropométricos</h3>
            <div style={{ display: 'grid', gap: '0.75rem', gridTemplateColumns: '1fr 1fr' }}>
              <div><span className="text-muted">Altura</span><div style={{ fontWeight: 700 }}>{patient.altura ? `${Number(patient.altura).toFixed(2)} m` : '—'}</div></div>
              <div><span className="text-muted">Peso</span><div style={{ fontWeight: 700 }}>{patient.peso ? `${Number(patient.peso).toFixed(1)} kg` : '—'}</div></div>
              {alturaNum > 0 && pesoNum > 0 && (
                <div><span className="text-muted">IMC</span><div style={{ fontWeight: 700 }}>{bmi.toFixed(1)}</div></div>
              )}
            </div>
          </div>
          <div className="dash-card">
            <h3>Informações</h3>
            <p><span className="text-muted">Objetivo:</span> {patient.objetivo || '—'}</p>
            {patient.criado_em && <p><span className="text-muted">Cadastro:</span> {new Date(patient.criado_em).toLocaleDateString('pt-BR')}</p>}
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
