import { useState, useEffect } from 'react';
import { useParams, useNavigate, Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { apiRequest } from '../../api/client';
import Icon from '../../components/Icon';
import Navbar from '../../components/Navbar';

interface Note {
  id: number;
  patient_id: number;
  categoria?: string;
  content: string;
  criado_em?: string;
}

export default function Anotacoes() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [patientName, setPatientName] = useState('Paciente');
  const [showForm, setShowForm] = useState(false);
  const [titulo, setTitulo] = useState('');
  const [conteudo, setConteudo] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user) { navigate('/', { replace: true }); return; }
    loadNotes();
  }, [user]);

  const loadNotes = async () => {
    try {
      const data = await apiRequest<{ notes?: Note[] }>(`/notes?patient_id=${id}`);
      const notes = Array.isArray(data?.notes) ? data.notes : [];
      setNotes(notes);
      if (notes.length) setPatientName(notes[0].patient_id ? `Paciente #${notes[0].patient_id}` : 'Paciente');
    } catch {
      navigate('/pacientes', { replace: true });
    }
    setLoading(false);
  };

  const createNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!titulo.trim() || !conteudo.trim()) return;
    setSaving(true);
    try {
      await apiRequest(`/notes`, { method: 'POST', body: { patient_id: Number(id), categoria: titulo, content: conteudo } });
      setTitulo('');
      setConteudo('');
      setShowForm(false);
      loadNotes();
    } catch { /* */ }
    setSaving(false);
  };

  if (user && user.role !== 'nutritionist' && user.role !== 'personal_trainer') {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <main className="page-main">
      <Navbar />
      <div className="container" style={{ padding: '2rem 1.5rem', maxWidth: '66rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.5rem' }}>
          <div>
            <h1 style={{ margin: 0 }}>Anotações</h1>
            <p className="text-muted">{patientName}</p>
          </div>
          <button className="btn btn-primary" onClick={() => setShowForm(prev => !prev)}>
            <Icon name="plus" /> {showForm ? 'Cancelar' : 'Nova anotação'}
          </button>
        </div>

        {showForm && (
          <form className="card" onSubmit={createNote} style={{ marginBottom: '1.5rem' }}>
            <div className="form">
              <div className="field">
                <label>Título</label>
                <input className="input" value={titulo} onChange={e => setTitulo(e.target.value)} required />
              </div>
              <div className="field">
                <label>Conteúdo</label>
                <textarea className="input textarea" rows={5} value={conteudo} onChange={e => setConteudo(e.target.value)} required />
              </div>
              <button className="btn btn-primary" type="submit" disabled={saving}>
                {saving ? 'Salvando...' : <><Icon name="save" /> Salvar anotação</>}
              </button>
            </div>
          </form>
        )}

        {loading ? (
          <div style={{ textAlign: 'center', padding: '2rem' }}><div className="spinner" /></div>
        ) : notes.length === 0 ? (
          <div className="card" style={{ textAlign: 'center', padding: '2rem' }}>
            <Icon name="bookOpen" size={48} style={{ color: 'var(--muted-foreground)' }} />
            <h3 style={{ margin: '1rem 0 0.5rem' }}>Nenhuma anotação</h3>
            <p className="text-muted">Crie sua primeira anotação para acompanhar este paciente.</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gap: '1rem' }}>
            {notes.map(n => (
              <div key={n.id} className="card eq">
                <h3 style={{ marginBottom: '0.5rem' }}>{n.categoria || 'Anotação'}</h3>
                <p style={{ whiteSpace: 'pre-wrap', fontSize: '0.9rem' }}>{n.content}</p>
                {n.criado_em && <span className="text-muted" style={{ fontSize: '0.78rem' }}>{new Date(n.criado_em).toLocaleDateString('pt-BR')} {new Date(n.criado_em).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>}
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
