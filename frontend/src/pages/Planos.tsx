import { apiRequest } from '../api/client';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import Icon from '../components/Icon';

const FREE_FEATURES = [
  { label: 'Cadastro e perfil pessoal', free: true, premium: true },
  { label: 'Convites de profissionais', free: true, premium: true },
  { label: 'Campainha de lembretes', free: true, premium: true },
  { label: 'NutriAI (respostas limitadas)', free: true, premium: true },
  { label: 'Dashboard completo', free: false, premium: true },
  { label: 'Dietas e treinos personalizados', free: false, premium: true },
  { label: 'Calendário de refeições e treinos', free: false, premium: true },
  { label: 'Notificações por e-mail', free: false, premium: true },
  { label: 'Área do profissional (pacientes)', free: false, premium: true },
  { label: 'Suporte prioritário via WhatsApp', free: false, premium: true },
];

const FAQ = [
  {
    q: 'O que está incluído no Premium?',
    a: 'Acesso completo ao dashboard, dietas e treinos personalizados, calendário, notificações por e-mail e a área do profissional para gerenciar pacientes.',
  },
  {
    q: 'Posso cancelar quando quiser?',
    a: 'Sim. O pagamento é único e você mantém o acesso sem mensalidades. Não há renovação automática.',
  },
  {
    q: 'Como recebo o acesso?',
    a: 'Após o pagamento você é redirecionado e seu e-mail libera o Premium automaticamente em alguns instantes.',
  },
];

export default function Planos() {
  const handleCheckout = async () => {
    try {
      const res = await apiRequest<{ checkout_url: string }>('/billing/checkout', { method: 'POST' });
      window.location.href = res.checkout_url;
    } catch (err: any) {
      alert(err.message || 'Erro ao iniciar checkout');
    }
  };

  return (
    <main className="page-main">
      <Navbar />

      <section className="plans-hero">
        <span className="badge plans-hero-badge">
          <Icon name="star" /> PREMIUM
        </span>
        <h1 className="plans-hero-title">Acelere seus resultados com o Premium</h1>
        <p className="plans-hero-sub">
          Desbloqueie o plano de nutrição e treinos completo da NutriNow: dashboard,
          dietas e treinos personalizados, calendário e lembretes por e-mail.
        </p>
      </section>

      <div className="container" style={{ padding: '0 1.5rem 3rem' }}>
        <div className="plan-card plan-highlight">
          <span className="plan-tag">MAIS POPULAR</span>
          <div className="plan-head">
            <div>
              <h3 className="plan-name">Premium</h3>
              <p className="plan-tagline">Acesso completo e vitalício</p>
            </div>
            <div className="plan-price">
              <span className="plan-value">R$ 29,90</span>
              <span className="plan-period">pagamento único</span>
            </div>
          </div>

          <ul className="plan-features">
            {FREE_FEATURES.filter(f => f.premium).map((f, i) => (
              <li key={i}>
                <Icon name="check" size={18} className="check-icon" />
                <span>{f.label}</span>
              </li>
            ))}
          </ul>

          <button className="btn btn-primary plan-cta" onClick={handleCheckout}>
            <Icon name="lock" size={16} /> Assinar Premium por R$ 29,90
          </button>
          <p className="plan-note">Pagamento seguro · acesso liberado na hora</p>
        </div>

        <div className="plan-compare">
          <h2 className="plan-compare-title">Compare os planos</h2>
          <div className="plan-compare-grid">
            <div className="plan-compare-row plan-compare-header">
              <span>Recurso</span>
              <span>Grátis</span>
              <span>Premium</span>
            </div>
            {FREE_FEATURES.map((f, i) => (
              <div className="plan-compare-row" key={i}>
                <span>{f.label}</span>
                <span>{f.free ? <Icon name="check" size={18} className="cmp-yes" /> : <Icon name="x" size={18} className="cmp-no" />}</span>
                <span>{f.premium ? <Icon name="check" size={18} className="cmp-yes" /> : <Icon name="x" size={18} className="cmp-no" />}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="plan-faq">
          <h2 className="plan-compare-title">Perguntas frequentes</h2>
          <div className="plan-faq-list">
            {FAQ.map((item, i) => (
              <div className="plan-faq-item" key={i}>
                <h3><Icon name="help" size={18} /> {item.q}</h3>
                <p className="text-muted">{item.a}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <Footer />
    </main>
  );
}
