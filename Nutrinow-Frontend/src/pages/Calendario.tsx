import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { apiRequest, getNotificacoes, marcarNotificacaoLida, type Notificacao } from '../api/client';
import Icon from '../components/Icon';
import NavLink from '../components/NavLink';

interface DietaTreinoItem {
  id: number;
  title: string;
  description?: string;
  time?: string;
  tipo: string;
  created_at: string;
  duration_minutes?: number;
}

interface CalendarEntry {
  id: number;
  date: string;
  title: string;
  description?: string;
  category: string;
}

const WEEKDAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
const MONTHS = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];

function toDateStr(iso: string): string {
  return iso ? iso.slice(0, 10) : '';
}

export default function Calendario() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [entries, setEntries] = useState<CalendarEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [today] = useState(new Date());
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [notificacoes, setNotificacoes] = useState<Notificacao[]>([]);

  useEffect(() => {
    if (!user) { navigate('/login', { replace: true }); return; }
    loadEntries();
    loadNotificacoes();
  }, []);

  const loadNotificacoes = async () => {
    try {
      setNotificacoes(await getNotificacoes());
    } catch { /* ok */ }
  };

  const marcarLida = async (id: number) => {
    setNotificacoes(prev => prev.map(n => (n.id === id ? { ...n, lida: 1 } : n)));
    try {
      await marcarNotificacaoLida(id);
    } catch { /* ok */ }
  };

  const loadEntries = async () => {
    try {
      const [dietaRes, treinoRes] = await Promise.all([
        apiRequest<{ success: boolean; items: DietaTreinoItem[] }>('/dieta-treino?tipo=dieta'),
        apiRequest<{ success: boolean; items: DietaTreinoItem[] }>('/dieta-treino?tipo=treino'),
      ]);
      const items = [...(dietaRes.items || []), ...(treinoRes.items || [])];
      setEntries(items.map(i => ({
        id: i.id,
        date: toDateStr(i.created_at),
        title: i.title,
        description: i.description,
        category: i.tipo === 'dieta' ? 'Dieta' : 'Treino',
      })));
    } catch { /* ok */ }
    setLoading(false);
  };

  const prevMonth = () => { if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1); } else setViewMonth(m => m - 1); };
  const nextMonth = () => { if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1); } else setViewMonth(m => m + 1); };

  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const firstDay = new Date(viewYear, viewMonth, 1).getDay();
  const entriesMap = new Map<string, CalendarEntry[]>();
  entries.forEach(e => {
    const key = e.date;
    if (!entriesMap.has(key)) entriesMap.set(key, []);
    entriesMap.get(key)!.push(e);
  });

  const days: (number | null)[] = [];
  for (let i = 0; i < firstDay; i++) days.push(null);
  for (let d = 1; d <= daysInMonth; d++) days.push(d);

  const selectedKey = selectedDate ? `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(selectedDate.getDate()).padStart(2, '0')}` : '';
  const selectedEntries = entriesMap.get(selectedKey) || [];

  const role = user?.role;
  const showPacientes = role === 'nutritionist' || role === 'personal_trainer';

  return (
    <main className="page-main">
      <nav className="navbar">
        <Link to="/" className="brand">
          <span className="brand-logo"><img src="/logo.png" alt="NutriNow" width="32" height="32" /></span>
          <span>Nutri<span className="text-primary">Now</span></span>
        </Link>
        <div className="nav-links">
          <NavLink to="/chat" className="nav-link">Chat</NavLink>
          <NavLink to="/dieta-treino" className="nav-link">Dieta-Treino</NavLink>
          <NavLink to="/dashboard" className="nav-link">Dashboard</NavLink>
          {showPacientes && <NavLink to="/pacientes" className="nav-link">Pacientes</NavLink>}
          <button className="btn btn-ghost" onClick={logout} style={{ fontSize: '0.85rem' }}><Icon name="logout" size={16} /> Sair</button>
        </div>
      </nav>
      <div className="container" style={{ padding: '2rem 1.5rem', maxWidth: '66rem' }}>
        <h1 style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
          <Icon name="calendar" />
          Calendário
        </h1>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '2rem' }}><div className="spinner" /></div>
        ) : (
          <>
            <div className="calendar-wrap">
              <div className="calendar-nav">
                <button className="btn btn-ghost" onClick={prevMonth}><Icon name="arrowLeft" /></button>
                <span style={{ fontWeight: 700, fontSize: '1.15rem' }}>{MONTHS[viewMonth]} {viewYear}</span>
                <button className="btn btn-ghost" onClick={nextMonth}><Icon name="arrowRight" /></button>
              </div>
              <div className="calendar-grid">
                {WEEKDAYS.map(d => <div key={d} className="calendar-weekday">{d}</div>)}
                {days.map((d, i) => {
                  const idx = d !== null ? `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}` : '';
                  const hasEntries = d !== null && (entriesMap.get(idx)?.length || 0) > 0;
                  const isToday = d !== null && d === today.getDate() && viewMonth === today.getMonth() && viewYear === today.getFullYear();
                  const isSelected = selectedDate && d === selectedDate.getDate();
                  return (
                    <button key={i} className={`calendar-day${isToday ? ' today' : ''}${isSelected ? ' selected' : ''}`} onClick={() => { if (d) setSelectedDate(new Date(viewYear, viewMonth, d)); }} disabled={!d}>
                      {d !== null ? <span>{d}</span> : null}
                      {hasEntries && <span className="calendar-dot" />}
                    </button>
                  );
                })}
              </div>
            </div>

            {notificacoes.length > 0 && (
              <section className="card" style={{ marginTop: '1.5rem' }}>
                <h3 style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Icon name="bell" />
                  Lembretes
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {notificacoes.map(n => (
                    <div
                      key={n.id}
                      className="card eq"
                      style={{ padding: '0.85rem', opacity: n.lida ? 0.6 : 1, cursor: n.lida ? 'default' : 'pointer' }}
                      onClick={() => { if (!n.lida) marcarLida(n.id); }}
                    >
                      <div style={{ fontWeight: 600, display: 'flex', justifyContent: 'space-between', gap: '0.5rem' }}>
                        <span>{n.titulo}</span>
                        {!n.lida && <span className="badge badge-outline" style={{ fontSize: '0.7rem' }}>novo</span>}
                      </div>
                      <p className="text-muted" style={{ marginTop: '0.25rem', fontSize: '0.85rem' }}>{n.mensagem}</p>
                      <div style={{ marginTop: '0.35rem', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                        <span className="badge badge-outline">{n.tipo === 'dieta' ? 'Dieta' : 'Treino'}</span>
                        <span className="text-muted" style={{ fontSize: '0.75rem' }}>
                          {new Date(n.agendado_para).toLocaleString('pt-BR')}
                        </span>
                        {n.enviado_email ? (
                          <span className="badge badge-outline" style={{ fontSize: '0.7rem' }}>e-mail enviado</span>
                        ) : null}
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {selectedDate && (
              <section className="card" style={{ marginTop: '1.5rem' }}>
                <h3 style={{ marginBottom: '1rem' }}>Eventos em {selectedDate.getDate()} de {MONTHS[selectedDate.getMonth()]}</h3>
                {selectedEntries.length === 0 ? (
                  <p className="text-muted">Nenhum evento neste dia.</p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    {selectedEntries.map(e => (
                      <div key={e.id} className="card eq" style={{ padding: '0.85rem' }}>
                        <div style={{ fontWeight: 600 }}>{e.title}</div>
                        {e.description && <p className="text-muted" style={{ marginTop: '0.25rem', fontSize: '0.85rem' }}>{e.description}</p>}
                        <span className="badge badge-outline" style={{ marginTop: '0.35rem' }}>{e.category}</span>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            )}
          </>
        )}
      </div>
    </main>
  );
}
