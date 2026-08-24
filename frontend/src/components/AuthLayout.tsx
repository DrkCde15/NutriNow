import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
const heroImg = '/hero-nutrition.jpg';

interface Props {
  title: string;
  subtitle: string;
  children: ReactNode;
  footer?: ReactNode;
}

export default function AuthLayout({ title, subtitle, children, footer }: Props) {
  return (
    <main>
      <div className="auth-layout">
        <section className="auth-panel">
          <Link to="/" className="brand" style={{ marginBottom: 'auto' }}>
            <span className="brand-logo"><img src="/logo.png" alt="NutriNow" width="36" height="36" /></span>
            <span>Nutri<span className="text-primary">Now</span></span>
          </Link>
          <div className="auth-form-wrap">
            <h1>{title}</h1>
            <p>{subtitle}</p>
            {children}
            {footer && <div className="auth-footer">{footer}</div>}
          </div>
        </section>
        <aside className="auth-visual">
          <img src={heroImg} alt="" width="1280" height="960" />
          <div className="auth-quote">
            <blockquote>"Mudei minha rotina em semanas. O NutriNow virou meu coach pessoal de bolso."</blockquote>
            <div className="auth-person" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginTop: '1rem' }}>
              <span style={{ width: '2.5rem', height: '2.5rem', borderRadius: '50%', background: 'var(--primary)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800 }}>A</span>
              <div>
                <strong>Amanda S.</strong>
                <p className="text-muted" style={{ margin: 0, fontSize: '0.85rem' }}>Estudante de Nutrição</p>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </main>
  );
}
