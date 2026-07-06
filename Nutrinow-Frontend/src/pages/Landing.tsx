import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Icon from '../components/Icon';
const heroImg = '/hero-nutrition.jpg';

const BMI_CATEGORIES = [
  { min: 0, max: 18.49, label: 'Abaixo do peso', range: '< 18.5', color: '#60a5fa', shape: '/bmi-shape-1.png' },
  { min: 18.5, max: 24.9, label: 'Peso normal', range: '18.5 - 24.9', color: '#22c55e', shape: '/bmi-shape-2.png' },
  { min: 25, max: 29.9, label: 'Sobrepeso', range: '25 - 29.9', color: '#facc15', shape: '/bmi-shape-3.png' },
  { min: 30, max: 34.9, label: 'Obesidade I', range: '30 - 34.9', color: '#fb923c', shape: '/bmi-shape-4.png' },
  { min: 35, max: Infinity, label: 'Obesidade II+', range: '> 35', color: '#ef4444', shape: '/bmi-shape-5.png' },
];

const FEATURES = [
  { icon: 'apple', title: 'Dietas personalizadas', desc: 'Cardápios montados pela IA com base no seu objetivo, restrições e rotina.' },
  { icon: 'dumbbell', title: 'Treinos sob medida', desc: 'Programas semanais adaptados ao seu nível, equipamento e tempo disponível.' },
  { icon: 'camera', title: 'Análise por foto', desc: 'Tire foto da refeição e receba estimativa de calorias e macros na hora.' },
  { icon: 'message', title: 'Chat com NutriAI', desc: 'Tire dúvidas, ajuste planos e receba motivação a qualquer hora.', href: '/chat' },
];

export default function Landing() {
  const { user } = useAuth();
  const [weight, setWeight] = useState(Number(user?.peso) || 68);
  const [height, setHeight] = useState(Number(user?.altura) || 1.72);

  const bmi = weight / (height * height);
  const category = BMI_CATEGORIES.find(c => bmi >= c.min && bmi <= c.max) || BMI_CATEGORIES[1];
  const activeIndex = BMI_CATEGORIES.indexOf(category);

  return (
    <main>
      <Navbar />
      <section className="hero">
        <div className="hero-grid container">
          <div className="hero-copy">
            <span className="badge"><Icon name="sparkles" /> Powered by NutriAI</span>
            <h1>Sua rotina saudável, <span className="text-gradient">guiada por IA.</span></h1>
            <p>Planos de dieta e treino personalizados, análise de refeições pela foto e um assistente que conversa com você 24/7. Tudo em um só lugar.</p>
            <div className="hero-actions">
              <Link to="/cadastro" className="btn btn-primary"><Icon name="sparkles" /> Criar conta grátis <Icon name="arrowRight" /></Link>
              <a href="#features" className="btn btn-secondary">Ver como funciona</a>
            </div>
            <div className="hero-checks">
              <span><Icon name="check" /> Sem cartão</span>
              <span><Icon name="check" /> Cancela quando quiser</span>
            </div>
          </div>
          <div className="hero-media">
            <div className="hero-glow" aria-hidden />
            <div className="hero-image" style={{ aspectRatio: '1/1', maxHeight: '30rem' }}>
              <img src={heroImg} alt="Smoothie verde com frutas" width="1280" height="960" />
            </div>
          </div>
        </div>
      </section>

      <section className="section" id="features">
        <div className="container">
          <div className="section-heading">
            <h2>Tudo que você precisa para se sentir bem</h2>
            <p>Um app completo que combina nutrição, treino e inteligência artificial numa experiência simples.</p>
          </div>
          <div className="features-grid">
            {FEATURES.map((f) => (
              f.href
                ? <Link key={f.title} to={f.href} className="feature-card">
                    <span className="feature-icon"><Icon name={f.icon} size={24} /></span>
                    <h3>{f.title}</h3>
                    <p>{f.desc}</p>
                  </Link>
                : <article key={f.title} className="feature-card">
                    <span className="feature-icon"><Icon name={f.icon} size={24} /></span>
                    <h3>{f.title}</h3>
                    <p>{f.desc}</p>
                  </article>
            ))}
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <div className="bmi-card" style={{ boxShadow: `0 0 60px ${category.color}26` }}>
            <div className="bmi-grid">
              <div className="bmi-copy">
                <span className="badge"><Icon name="activity" /> Simulador de IMC</span>
                <h2>Veja o avatar reagir ao seu IMC em tempo real</h2>
                <p>Arraste os controles de peso e altura para calcular o IMC e observar o corpo estilizado mudar.</p>
                <div className="slider-stack">
                  <div className="slider-field">
                    <div className="slider-row">
                      <div className="slider-label"><Icon name="scale" /> Peso</div>
                      <span className="slider-value">{Math.round(weight)} kg</span>
                    </div>
                    <input type="range" min={35} max={180} step={1} value={weight} onChange={e => setWeight(Number(e.target.value))} />
                  </div>
                  <div className="slider-field">
                    <div className="slider-row">
                      <div className="slider-label"><Icon name="ruler" /> Altura</div>
                      <span className="slider-value">{height.toFixed(2)} m</span>
                    </div>
                    <input type="range" min={1.3} max={2.1} step={0.01} value={height} onChange={e => setHeight(Number(e.target.value))} />
                  </div>
                </div>
              </div>
              <div className="bmi-result-card">
                <div className="bmi-avatar" style={{ border: `3px solid ${category.color}` }}>
                  <img src={category.shape} alt="" />
                </div>
                <small>IMC atual</small>
                <div className="bmi-number">{bmi.toFixed(1)}</div>
                <div className="bmi-pill" style={{ background: `${category.color}20`, color: category.color }}>{category.label}</div>
                <div className="bmi-categories">
                  {BMI_CATEGORIES.map((c, i) => (
                    <div key={c.label} className="bmi-category" style={i === activeIndex ? { background: `${c.color}20`, color: c.color } : {}}>
                      <strong>{c.range}</strong>
                      <span>{c.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="section-tight" style={{ padding: '3rem 0 5rem' }}>
        <div className="container">
          <div className="cta-card">
            <div className="cta-content">
              <h2>Comece sua jornada saudável hoje.</h2>
              <p>Crie sua conta grátis e tenha um plano personalizado em minutos.</p>
              <div className="inline-actions">
                <Link to="/cadastro" className="btn btn-light">Criar conta grátis <Icon name="arrowRight" /></Link>
                <a href="#features" className="btn btn-white">Saber mais</a>
              </div>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
}

function Navbar() {
  const { user } = useAuth();
  return (
    <nav className="navbar">
      <Link to="/" className="brand">
        <span className="brand-logo"><img src="/logo.png" alt="NutriNow" width="32" height="32" /></span>
        <span>Nutri<span className="text-primary">Now</span></span>
      </Link>
      <div className="nav-links">
        {user ? (
          <>
            <Link to={user.role === 'nutritionist' || user.role === 'personal_trainer' ? '/pacientes' : '/dashboard'} className="nav-link">
              Dashboard
            </Link>
            <Link to="/chat" className="nav-link">Chat</Link>
            <Link to="/perfil" className="nav-link">Perfil</Link>
            {user.role === 'nutritionist' || user.role === 'personal_trainer' ? (
              <Link to="/anotacoes" className="nav-link">Anotações</Link>
            ) : null}
          </>
        ) : (
          <>
            <Link to="/login" className="nav-link">Entrar</Link>
            <Link to="/cadastro" className="btn btn-primary" style={{ padding: '0.5rem 1.2rem', fontSize: '0.85rem' }}>Criar conta</Link>
          </>
        )}
        <Link to="/feedbacks" className="nav-link">Feedbacks</Link>
      </div>
    </nav>
  );
}

function Footer() {
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
            <Link to="/planos" className="nav-link" style={{ display: 'block', paddingLeft: 0 }}>Planos</Link>
            <Link to="/chat" className="nav-link" style={{ display: 'block', paddingLeft: 0 }}>NutriAI</Link>
          </div>
          <div>
            <h4>Empresa</h4>
            <Link to="/termos" className="nav-link" style={{ display: 'block', paddingLeft: 0 }}>Termos</Link>
            <Link to="/privacidade" className="nav-link" style={{ display: 'block', paddingLeft: 0 }}>Privacidade</Link>
            <Link to="/lgpd" className="nav-link" style={{ display: 'block', paddingLeft: 0 }}>LGPD</Link>
          </div>
          <div>
            <h4>Suporte</h4>
            <Link to="/feedbacks" className="nav-link" style={{ display: 'block', paddingLeft: 0 }}>Feedbacks</Link>
          </div>
        </div>
        <div style={{ borderTop: '1px solid var(--border)', marginTop: '2rem', paddingTop: '1rem', textAlign: 'center', fontSize: '0.85rem', color: 'var(--muted-foreground)' }}>
          &copy; {new Date().getFullYear()} NutriNow. Todos os direitos reservados.
        </div>
      </div>
    </footer>
  );
}
