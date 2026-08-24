import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import Icon from '../components/Icon';
import NavLink from '../components/NavLink';
import { pexelsImage, handlePexelsError } from '../lib/images';

function useReveal() {
  const rootRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const targets = root.querySelectorAll<HTMLElement>('.reveal');
    if (!('IntersectionObserver' in window)) {
      targets.forEach(t => t.classList.add('in-view'));
      return;
    }
    const io = new IntersectionObserver(
      entries => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            entry.target.classList.add('in-view');
            io.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.18, rootMargin: '0px 0px -8% 0px' }
    );
    targets.forEach(t => io.observe(t));
    return () => io.disconnect();
  }, []);
  return rootRef;
}

const MARQUEE = [
  'Nutricao', 'Treino', 'IA conversacional', 'Calendario', 'Dashboard',
  'Academias', 'Rotina', 'Progresso',
];

const PIN_ITEMS = [
  {
    icon: 'sparkles' as const,
    title: 'Conversas com contexto',
    text: 'A NutriAI lembra do seu historico, da sua rotina e dos seus objetivos para responder como uma nutricionista de verdade.',
  },
  {
    icon: 'calendar' as const,
    title: 'Rotina visual no calendario',
    text: 'Dieta e treinos aparecem mesclados em um calendario limpo, com lembretes que seguem a sua semana.',
  },
  {
    icon: 'activity' as const,
    title: 'Evolucao que voce enxerga',
    text: 'Peso, altura, IMC e atividades recentes reunidos em um dashboard que mostra a trajetoria, nao so o numero de hoje.',
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
                  <span>{c.max === Infinity ? `${c.min}+` : c.max}</span>
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
              aria-label="Altura em centimetros"
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
  const rootRef = useReveal();

  return (
    <main className="page-main lp">
      <Navbar />
      <div ref={rootRef}>

      <section className="lp-hero">
        <div className="lp-hero-bg" />
        <div className="container">
          <div className="lp-hero-inner">
            <h1 className="reveal">
              Sua saude <span className="ink">inteligente, guiada por IA</span>
            </h1>
            <p className="reveal" style={{ ['--rd' as string]: '0.1s' } as React.CSSProperties}>
              Acompanhe nutricao, treinos e rotina em um so lugar. Receba orientacao
              personalizada da NutriAI e mantenha o foco nos seus objetivos.
            </p>
            <div className="lp-hero-actions reveal" style={{ ['--rd' as string]: '0.18s' } as React.CSSProperties}>
              <NavLink to={ctaTo} className="btn btn-primary">Criar conta gratis</NavLink>
              <NavLink to="/chat" className="btn btn-ghost" style={{ border: '1.5px solid var(--border)', background: 'var(--card)' }}>
                Falar com a NutriAI
              </NavLink>
            </div>

            <div className="lp-hero-media reveal" style={{ ['--rd' as string]: '0.26s' } as React.CSSProperties}>
               <img src={pexelsImage('healthy meal plate', 1600, 900)} alt="Mesa com comida saudavel preparada" loading="lazy" onError={(e) => handlePexelsError(e, 'healthy meal plate', 1600, 900)} />
            </div>
          </div>
        </div>
      </section>

      <section className="lp-marquee" aria-hidden>
        <div className="lp-marquee-track">
          {[...MARQUEE, ...MARQUEE].map((word, i) => (
            <span key={i} className="lp-marquee-item">{word}</span>
          ))}
        </div>
      </section>

      <section className="lp-section">
        <div className="container">
          <div className="section-heading reveal">
            <h2>Tudo o que voce precisa, em um so lugar</h2>
            <p className="text-muted">
              Ferramentas simples para cuidar da alimentacao, dos treinos e da rotina, sem trocar de app o dia todo.
            </p>
          </div>

          <div className="lp-bento">
            <article className="lp-card lp-card--a lp-card--media reveal">
              <div className="lp-card-media">
                 <img src={pexelsImage('nutrition health app smartphone', 1000, 800)} alt="Assistente de nutricao por IA" loading="lazy" onError={(e) => handlePexelsError(e, 'nutrition health app smartphone', 1000, 800)} />
              </div>
              <div className="lp-card-overlay" />
              <div className="lp-card-content">
                <Icon name="sparkles" size={26} />
                <h3 style={{ marginTop: '0.9rem' }}>NutriAI</h3>
                <p>
                  Converse com sua assistente de nutricao e treinos. Ela usa o seu perfil e a sua
                  rotina para dar respostas que fazem sentido para voce.
                </p>
              </div>
            </article>

            <article className="lp-card lp-card--b lp-card--media reveal" style={{ ['--rd' as string]: '0.06s' } as React.CSSProperties}>
              <div className="lp-card-media">
                 <img src={pexelsImage('healthy food bowl', 800, 1000, 'portrait')} alt="Refeicao saudavel em proporcoes" loading="lazy" onError={(e) => handlePexelsError(e, 'healthy food bowl', 800, 1000)} />
              </div>
              <div className="lp-card-overlay" />
              <div className="lp-card-content">
                <h3>Dietas</h3>
                <p>Registre e organize planos alimentares com horarios e recorrencia semanal.</p>
              </div>
            </article>

            <article className="lp-card lp-card--c lp-card--media reveal" style={{ ['--rd' as string]: '0.1s' } as React.CSSProperties}>
              <div className="lp-card-media">
                 <img src={pexelsImage('workout gym', 800, 600)} alt="Pessoa treinando em academia" loading="lazy" style={{ filter: 'grayscale(0.15) contrast(1.05)' }} onError={(e) => handlePexelsError(e, 'workout gym', 800, 600)} />
              </div>
              <div className="lp-card-overlay" />
              <div className="lp-card-content">
                <h3>Treinos</h3>
                <p>Cadastre exercicios e acompanhe a rotina.</p>
              </div>
            </article>

            <article className="lp-card lp-card--d lp-card--media reveal" style={{ ['--rd' as string]: '0.14s' } as React.CSSProperties}>
              <div className="lp-card-media">
                 <img src={pexelsImage('monthly calendar planner', 800, 600)} alt="Calendario mensal com lembretes" loading="lazy" onError={(e) => handlePexelsError(e, 'monthly calendar planner', 800, 600)} />
              </div>
              <div className="lp-card-overlay" />
              <div className="lp-card-content">
                <h3>Calendario</h3>
                <p>Dieta e treinos em um calendario mensal com lembretes da sua rotina.</p>
              </div>
            </article>

            <article className="lp-card lp-card--e lp-card--media reveal" style={{ ['--rd' as string]: '0.18s' } as React.CSSProperties}>
              <div className="lp-card-media">
                 <img src={pexelsImage('spreadsheet data chart analytics', 800, 600)} alt="Planilha e graficos de dados" loading="lazy" onError={(e) => handlePexelsError(e, 'spreadsheet data chart analytics', 800, 600)} />
              </div>
              <div className="lp-card-overlay" />
              <div className="lp-card-content">
                <h3>Dashboard</h3>
                <p>Peso, altura, IMC e historico recente em um so lugar.</p>
              </div>
            </article>
          </div>
        </div>
      </section>

      <section className="lp-section lp-section--tight">
        <div className="container">
          <div className="lp-pin">
            <div className="lp-pin-title reveal">
              <h2>Pensado para acompanhar voce todos os dias</h2>
              <p className="text-muted">
                Nao e so um app de anotar comida. E um espaco que junta conversa, planejamento e
                evolucao em uma experiencia unica.
              </p>
            </div>
            <div className="lp-pin-list">
              {PIN_ITEMS.map((item, i) => (
                <div
                  key={item.title}
                  className="lp-pin-item reveal"
                  style={{ ['--rd' as string]: `${i * 0.08}s` } as React.CSSProperties}
                >
                  <h3>
                    <Icon name={item.icon} size={20} style={{ verticalAlign: '-0.2em', marginRight: '0.5rem', color: 'var(--primary)' }} />
                    {item.title}
                  </h3>
                  <p>{item.text}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="lp-section" style={{ paddingTop: 0 }}>
        <BmiCalculator />
      </section>

      <section className="lp-section">
        <div className="container">
          <div className="cta-card reveal">
            <h2>Pronto para comecar?</h2>
            <p style={{ margin: 0, opacity: 0.9 }}>
              Crie sua conta gratis e deixe a NutriAI te ajudar a alcancar seus objetivos.
            </p>
            <div className="inline-actions">
              <NavLink to={ctaTo} className="btn btn-white">Criar conta gratis</NavLink>
              <Link to="/planos" className="btn btn-light">Ver planos</Link>
            </div>
          </div>
        </div>
      </section>

      <Footer />
      </div>
    </main>
  );
}
