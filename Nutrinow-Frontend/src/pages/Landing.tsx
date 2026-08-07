import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import Icon from '../components/Icon';
import NavLink from '../components/NavLink';

const FEATURES = [
  {
    icon: 'sparkles',
    title: 'NutriAI',
    text: 'Converse com sua assistente de nutrição e treinos, com contexto do seu perfil e rotina.',
  },
  {
    icon: 'leaf',
    title: 'Dietas',
    text: 'Registre e organize seus planos alimentares com horários e recorrência semanal.',
  },
  {
    icon: 'dumbbell',
    title: 'Treinos',
    text: 'Cadastre seus exercícios, acompanhe a rotina e mantenha o foco nos objetivos.',
  },
  {
    icon: 'calendar',
    title: 'Calendário',
    text: 'Visualize dieta e treinos em um calendário mensal com lembretes da sua rotina.',
  },
  {
    icon: 'activity',
    title: 'Dashboard',
    text: 'Acompanhe peso, altura, IMC e seu histórico recente de atividade em um só lugar.',
  },
];

interface BmiCategory {
  label: string;
  color: string;
  min: number;
  max: number;
}

const BMI_CATEGORIES: BmiCategory[] = [
  { label: 'Abaixo do peso', color: '#38bdf8', min: 0, max: 18.5 },
  { label: 'Peso ideal', color: '#22c55e', min: 18.5, max: 25 },
  { label: 'Sobrepeso', color: '#f59e0b', min: 25, max: 30 },
  { label: 'Obesidade', color: '#ef4444', min: 30, max: Infinity },
];

function categorize(bmi: number): BmiCategory {
  return BMI_CATEGORIES.find(c => bmi >= c.min && bmi < c.max) ?? BMI_CATEGORIES[BMI_CATEGORIES.length - 1];
}

function bmiShapeIndex(bmi: number): number {
  if (bmi < 18.5) return 0;
  if (bmi < 22) return 1;
  if (bmi < 25) return 2;
  if (bmi < 30) return 3;
  return 4;
}

function BmiCalculator() {
  const [weight, setWeight] = useState(70);
  const [height, setHeight] = useState(170);

  const bmi = height > 0 ? weight / Math.pow(height / 100, 2) : 0;
  const rounded = Math.round(bmi * 10) / 10;
  const category = categorize(bmi);
  const shapeIdx = bmiShapeIndex(bmi);

  return (
    <div className="container">
      <div className="bmi-card">
        <div className="bmi-grid">
          <div className="bmi-result-card">
            <div className="bmi-shapes">
              {[1, 2, 3, 4, 5].map(i => (
                <img
                  key={i}
                  src={`/bmi-shape-${i}.png`}
                  alt=""
                  className={`bmi-shape ${shapeIdx === i - 1 ? 'active' : ''}`}
                />
              ))}
            </div>
            <div className="bmi-number">{rounded || '—'}</div>
            <span className="bmi-pill" style={{ ['--bmi-color' as string]: category.color } as React.CSSProperties}>
              {category.label}
            </span>
            <div className="bmi-categories">
              {BMI_CATEGORIES.map(c => (
                <div
                  key={c.label}
                  className="bmi-category"
                  style={{
                    background: bmi >= c.min && bmi < c.max ? `${c.color}1a` : 'transparent',
                    color: bmi >= c.min && bmi < c.max ? c.color : 'var(--muted-foreground)',
                    fontWeight: bmi >= c.min && bmi < c.max ? 700 : 500,
                  }}
                >
                  <span>{c.label}</span>
                  <span>
                    {c.max === Infinity ? `${c.min}+` : c.max}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="slider-stack">
            <div className="slider-row">
              <span className="slider-label">
                <Icon name="scale" size={16} /> Peso
              </span>
              <strong>{weight} kg</strong>
            </div>
            <input
              type="range"
              min={30}
              max={200}
              value={weight}
              onChange={e => setWeight(Number(e.target.value))}
              aria-label="Peso em quilogramas"
            />

            <div className="slider-row">
              <span className="slider-label">
                <Icon name="ruler" size={16} /> Altura
              </span>
              <strong>{height} cm</strong>
            </div>
            <input
              type="range"
              min={120}
              max={220}
              value={height}
              onChange={e => setHeight(Number(e.target.value))}
              aria-label="Altura em centímetros"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Landing() {
  const { user } = useAuth();
  const ctaTo = user ? '/dashboard' : '/cadastro';

  return (
    <main className="page-main">
      <Navbar />

      <section className="hero">
        <div className="container">
          <div className="hero-grid">
            <div className="hero-copy">
              <h1>
                Sua saúde inteligente, <span className="text-gradient">guiada por IA</span>
              </h1>
              <p>
                Acompanhe nutrição, treinos e rotina em um só lugar. Receba orientação
                personalizada da NutriAI e mantenha o foco nos seus objetivos.
              </p>
              <div className="hero-actions">
                <NavLink to={ctaTo} className="btn btn-primary">Criar conta grátis</NavLink>
                <NavLink to="/chat" className="btn btn-white">Falar com a NutriAI</NavLink>
              </div>
              <div className="hero-checks">
                <span><Icon name="check" size={16} /> Grátis para começar</span>
                <span><Icon name="check" size={16} /> Premium com agenda interna</span>
              </div>
            </div>

            <div className="hero-media">
              <div className="hero-image">
                <img src="/hero-nutrition.jpg" alt="Alimentação saudável" />
              </div>
              <div className="floating-card">
                <Icon name="sparkles" size={18} />
                <span>NutriAI sempre pronta</span>
              </div>
              <div className="floating-card">
                <Icon name="checkCircle" size={18} />
                <span>Rotina em dia</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <div className="section-heading">
            <h2>Tudo o que você precisa</h2>
            <p className="text-muted">
              Ferramentas simples para cuidar da sua alimentação, dos seus treinos e da sua rotina.
            </p>
          </div>
          <div className="features-grid">
            {FEATURES.map(f => (
              <div key={f.title} className="feature-card">
                <div className="feature-icon">
                  <Icon name={f.icon} size={22} />
                </div>
                <h3 style={{ margin: '0 0 0.5rem', fontSize: '1.1rem' }}>{f.title}</h3>
                <p className="text-muted" style={{ margin: 0, fontSize: '0.92rem', lineHeight: 1.5 }}>{f.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="section" style={{ paddingTop: 0 }}>
        <BmiCalculator />
      </section>

      <section className="section">
        <div className="container">
          <div className="cta-card">
            <h2>Pronto para começar?</h2>
            <p style={{ margin: 0, opacity: 0.9 }}>
              Crie sua conta grátis e deixe a NutriAI te ajudar a alcançar seus objetivos.
            </p>
            <div className="inline-actions">
              <NavLink to={ctaTo} className="btn btn-white">Criar conta grátis</NavLink>
              <Link to="/planos" className="btn btn-light">Ver planos</Link>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
}
