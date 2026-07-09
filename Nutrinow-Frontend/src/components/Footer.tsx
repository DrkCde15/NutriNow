import { Link } from 'react-router-dom';
import Icon from './Icon';
import NavLink from './NavLink';

export default function Footer() {
  return (
    <footer className="footer">
      <div className="container">
        <div className="footer-grid">
          <div>
            <div className="brand">
              <span className="brand-logo"><img src="/logo.png" alt="NutriNow" width="32" height="32" /></span>
              <span>Nutri<span className="text-primary">Now</span></span>
            </div>
            <p className="text-muted" style={{ marginTop: '0.75rem', fontSize: '0.9rem' }}>
              Sua saúde inteligente, guiada por IA.
            </p>
          </div>
          <div>
            <h4>Produto</h4>
            <NavLink to="/planos" className="nav-link" style={{ display: 'block', paddingLeft: 0 }}>Planos</NavLink>
            <NavLink to="/chat" className="nav-link" style={{ display: 'block', paddingLeft: 0 }}>NutriAI</NavLink>
          </div>
          <div>
            <h4>Empresa</h4>
            <NavLink to="/termos" className="nav-link" style={{ display: 'block', paddingLeft: 0 }}>Termos</NavLink>
            <NavLink to="/privacidade" className="nav-link" style={{ display: 'block', paddingLeft: 0 }}>Privacidade</NavLink>
            <NavLink to="/lgpd" className="nav-link" style={{ display: 'block', paddingLeft: 0 }}>LGPD</NavLink>
          </div>
          <div>
            <h4>Suporte</h4>
            <NavLink to="/feedbacks" className="nav-link" style={{ display: 'block', paddingLeft: 0 }}>Feedbacks</NavLink>
          </div>
        </div>
        <div style={{ borderTop: '1px solid var(--border)', marginTop: '2rem', paddingTop: '1rem', textAlign: 'center', fontSize: '0.85rem', color: 'var(--muted-foreground)' }}>
          &copy; {new Date().getFullYear()} NutriNow. Todos os direitos reservados.
        </div>
      </div>
    </footer>
  );
}