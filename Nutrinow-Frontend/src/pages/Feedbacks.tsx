import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { apiRequest } from '../api/client';
import Icon from '../components/Icon';

interface Feedback {
  _id: string;
  nome: string;
  nota: number;
  texto: string;
  created_at: string;
}

export default function Feedbacks() {
  const { user } = useAuth();
  const [list, setList] = useState<Feedback[]>([]);
  const [loading, setLoading] = useState(true);
  const [nome, setNome] = useState('');
  const [nota, setNota] = useState(5);
  const [texto, setTexto] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => { loadFeedbacks(); }, []);

  const loadFeedbacks = async () => {
    try {
      const data = await apiRequest<Feedback[]>('/feedbacks');
      setList(data);
    } catch { /* ok */ }
    setLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nome.trim() || !texto.trim()) { setError('Preencha nome e mensagem.'); return; }
    setError('');
    setSending(true);
    try {
      await apiRequest('/feedbacks', { method: 'POST', body: { nome, nota, texto } });
      setSent(true);
      setNome('');
      setNota(5);
      setTexto('');
      loadFeedbacks();
      setTimeout(() => setSent(false), 3000);
    } catch (err: any) {
      setError(err.message || 'Erro ao enviar');
    } finally {
      setSending(false);
    }
  };

  return (
    <main className="page-main">
      <nav className="navbar">
        <Link to="/" className="brand">
          <span className="brand-logo"><img src="/logo.png" alt="NutriNow" width="32" height="32" /></span>
          <span>Nutri<span className="text-primary">Now</span></span>
        </Link>
        <div className="nav-links">
          {!user && <Link to="/login" className="nav-link">Login</Link>}
          {!user && <Link to="/cadastro" className="btn btn-primary" style={{ padding: '.4rem 1rem', fontSize: '.85rem' }}>Criar conta</Link>}
          {user && <Link to="/dashboard" className="nav-link">Dashboard</Link>}
          {user && <Link to="/chat" className="nav-link">Chat</Link>}
        </div>
      </nav>

      <div className="container" style={{ padding: '2rem 1.5rem', maxWidth: '66rem' }}>
        <h1>Feedbacks</h1>
        <p className="text-muted" style={{ marginBottom: '2rem' }}>Veja o que os usuários estão dizendo ou deixe sua opinião.</p>

        <section className="card" style={{ marginBottom: '2rem' }}>
          <h2 style={{ marginBottom: '1rem' }}>Deixe seu feedback</h2>
          {sent && <div className="alert" style={{ marginBottom: '1rem', background: 'oklch(0.5 0.2 145 / 0.1)', color: 'oklch(0.4 0.18 145)', borderColor: 'oklch(0.5 0.2 145 / 0.3)' }}><Icon name="check" /> Feedback enviado com sucesso!</div>}
          {error && <div className="alert" style={{ marginBottom: '1rem' }}><Icon name="alert" /> {error}</div>}
          <form className="form" onSubmit={handleSubmit}>
            <div className="field">
              <label>Nome</label>
              <input className="input" value={nome} onChange={e => setNome(e.target.value)} required maxLength={100} />
            </div>
            <div className="field">
              <label>Nota</label>
              <div className="stars-input">
                {[1,2,3,4,5].map(n => (
                  <button key={n} type="button" className="star-btn" onClick={() => setNota(n)} style={{ color: n <= nota ? 'var(--star)' : 'var(--border)' }}>
                    <Icon name="star" size={24} />
                  </button>
                ))}
              </div>
            </div>
            <div className="field">
              <label>Mensagem</label>
              <textarea className="input textarea" value={texto} onChange={e => setTexto(e.target.value)} required rows={4} />
            </div>
            <button className="btn btn-primary" type="submit" disabled={sending}>
              {sending ? 'Enviando...' : <><Icon name="send" /> Enviar feedback</>}
            </button>
          </form>
        </section>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '2rem' }}><div className="spinner" /></div>
        ) : list.length === 0 ? (
          <p className="text-muted">Nenhum feedback ainda. Seja o primeiro!</p>
        ) : (
          <div style={{ display: 'grid', gap: '1rem' }}>
            {list.map(f => (
              <div key={f._id} className="card eq">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                  <span style={{ fontWeight: 700 }}>{f.nome}</span>
                  <div style={{ display: 'flex', gap: '0.2rem' }}>
                    {[1,2,3,4,5].map(n => <Icon key={n} name="star" size={16} style={{ color: n <= f.nota ? 'var(--star)' : 'var(--border)' }} />)}
                  </div>
                </div>
                <p style={{ fontSize: '0.9rem' }}>{f.texto}</p>
                <span className="text-muted" style={{ fontSize: '0.78rem' }}>{new Date(f.created_at).toLocaleDateString('pt-BR')}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
