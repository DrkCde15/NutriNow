import { Link } from 'react-router-dom';
import { apiRequest } from '../api/client';
import Icon from '../components/Icon';

const FEATURES = [
  'NutriAI com respostas ilimitadas',
  'Dashboard completo',
  'Dietas personalizadas',
  'Treinos personalizados',
  'Calendário de refeições e treinos',
  'Suporte via WhatsApp',
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
      <nav className="navbar">
        <Link to="/" className="brand">
          <span className="brand-logo"><img src="/logo.png" alt="NutriNow" width="32" height="32" /></span>
          <span>Nutri<span className="text-primary">Now</span></span>
        </Link>
        <div className="nav-links">
          <Link to="/login" className="nav-link">Login</Link>
          <Link to="/cadastro" className="btn btn-primary" style={{ padding: '.4rem 1rem', fontSize: '.85rem' }}>Criar conta</Link>
        </div>
      </nav>

      <div className="plans-hero">
        <span className="badge" style={{ background: 'rgba(255,255,255,.12)', color: 'white', border: '1px solid rgba(255,255,255,.2)' }}>
          <Icon name="star" /> PREMIUM
        </span>
        <h1>Premium NutriNow</h1>
        <p className="text-muted" style={{ maxWidth: '36rem', margin: '0 auto' }}>
          Desbloqueie todo o potencial da NutriNow com funcionalidades exclusivas de nutrição e treinos.
        </p>
      </div>

      <div className="container" style={{ padding: '0 1.5rem 4rem', display: 'flex', justifyContent: 'center' }}>
        <div className="plan-card plan-highlight" style={{ maxWidth: '28rem' }}>
          <span className="plan-tag">ACESSO COMPLETO</span>
          <h3 className="plan-name">Premium</h3>
          <div className="plan-price">
            <span className="plan-value">R$ 29,90</span>
            <span style={{ fontSize: '1rem', color: 'var(--muted-foreground)' }}>único</span>
          </div>
          <ul className="plan-features">
            {FEATURES.map((f, i) => (
              <li key={i}><Icon name="check" size={16} className="check-icon" /> {f}</li>
            ))}
          </ul>
          <button className="btn btn-primary" onClick={handleCheckout} style={{ width: '100%' }}>
            Pagar R$ 29,90
          </button>
        </div>
      </div>

      <footer className="footer"><p className="text-muted" style={{ padding: '2rem 1rem' }}>© 2025 NutriNow</p></footer>
    </main>
  );
}
