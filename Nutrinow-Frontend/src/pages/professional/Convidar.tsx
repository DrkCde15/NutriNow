import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { apiRequest, criarConvite } from '../../api/client';
import Icon from '../../components/Icon';
import Navbar from '../../components/Navbar';

export default function Convidar() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState('');
  const [copiado, setCopiado] = useState(false);

  if (user && user.role !== 'nutritionist' && user.role !== 'personal_trainer') {
    return <>{navigate('/dashboard', { replace: true })}</>;
  }

  const gerarLink = async () => {
    setLoading(true);
    setErro('');
    setCopiado(false);
    try {
      const data = await criarConvite();
      const base = window.location.origin;
      setToken(`${base}/cadastro?convite=${data.token}`);
    } catch (err: unknown) {
      setErro(err instanceof Error ? err.message : 'Falha ao gerar convite');
    } finally {
      setLoading(false);
    }
  };

  const copiar = async () => {
    if (!token) return;
    try {
      await navigator.clipboard.writeText(token);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 1800);
    } catch {
      setErro('Não foi possível copiar. Copie o link manualmente.');
    }
  };

  return (
    <main className="page-main">
      <Navbar />
      <div className="container" style={{ padding: '2rem 1.5rem', maxWidth: '50rem' }}>
        <h1 style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
          <Icon name="bell" /> Convidar pacientes
        </h1>
        <p className="text-muted" style={{ marginBottom: '1.5rem' }}>
          Gere um link de convite e envie para seus pacientes se cadastrarem no NutriNow.
          Quando eles criarem a conta, você aparecerá no perfil deles como quem os convidou.
        </p>

        <section className="card">
          <button className="btn btn-primary" onClick={gerarLink} disabled={loading}>
            {loading ? 'Gerando...' : <><Icon name="plus" /> Gerar link de convite</>}
          </button>

          {erro && <div className="alert" role="alert" style={{ marginTop: '1rem' }}><Icon name="alert" /> {erro}</div>}

          {token && (
            <div className="convite-link-box" style={{ marginTop: '1.25rem' }}>
              <label className="text-muted" style={{ fontSize: '0.85rem' }}>Link de convite</label>
              <div className="input-wrap" style={{ marginTop: '0.35rem' }}>
                <input className="input" value={token} readOnly onFocus={(e) => e.currentTarget.select()} />
                <button className="password-toggle" onClick={copiar} aria-label="Copiar link"><Icon name="copy" size={18} /></button>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginTop: '0.6rem', flexWrap: 'wrap' }}>
                {copiado && <span className="status-pill status-positive" style={{ display: 'inline-flex' }}><Icon name="check" /> Link copiado</span>}
                <button className="btn btn-ghost" onClick={gerarLink} disabled={loading} style={{ fontSize: '0.8rem' }}>
                  {loading ? 'Gerando...' : <><Icon name="refresh" /> Gerar novo link</>}
                </button>
              </div>
              <p className="text-muted" style={{ fontSize: '0.8rem', marginTop: '0.75rem' }}>
                Envie este link pelo WhatsApp, e-mail ou onde seu paciente preferir.
                Cada link funciona uma única vez e expira em 7 dias.
              </p>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
