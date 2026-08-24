import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  apiRequest,
  getNotificacoes,
  marcarNotificacaoLida,
  getEventosCalendario,
  criarEventoCalendario,
  atualizarEventoCalendario,
  excluirEventoCalendario,
  type Notificacao,
  type CalendarioEvento,
} from '../api/client';
import Icon from '../components/Icon';
import Navbar from '../components/Navbar';
import { pexelsImage, handlePexelsError } from '../lib/images';

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
  id: string;
  date: string;
  title: string;
  description?: string;
  category: string;
  time?: string;
  fonte: 'dieta_treino' | 'evento';
}

const WEEKDAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
const MONTHS = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
const CATEGORIA_OPTIONS = [
  { value: 'evento', label: 'Evento' },
  { value: 'lembrete', label: 'Lembrete' },
  { value: 'dieta', label: 'Dieta' },
  { value: 'treino', label: 'Treino' },
];

function toDateStr(iso: string): string {
  return iso ? iso.slice(0, 10) : '';
}

function formatTime(time?: string): string {
  return time ? time.slice(0, 5) : '';
}

interface EventoForm {
  id: number | null;
  title: string;
  description: string;
  categoria: string;
  event_date: string;
  time: string;
  duration_minutes: string;
}

const EMPTY_FORM: EventoForm = {
  id: null,
  title: '',
  description: '',
  categoria: 'evento',
  event_date: '',
  time: '',
  duration_minutes: '',
};

export default function Calendario() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [entries, setEntries] = useState<CalendarEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [today] = useState(new Date());
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [notificacoes, setNotificacoes] = useState<Notificacao[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<EventoForm>(EMPTY_FORM);
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);

  const loadEntries = useCallback(async () => {
    setLoading(true);
    try {
      const [dietaRes, treinoRes, eventos] = await Promise.all([
        apiRequest<{ success: boolean; items: DietaTreinoItem[] }>('/dieta-treino?tipo=dieta'),
        apiRequest<{ success: boolean; items: DietaTreinoItem[] }>('/dieta-treino?tipo=treino'),
        getEventosCalendario(),
      ]);
      const items = [...(dietaRes.items || []), ...(treinoRes.items || [])];
      const dietTreinoEntries: CalendarEntry[] = items.map(i => ({
        id: `dt-${i.id}`,
        date: toDateStr(i.created_at),
        title: i.title,
        description: i.description,
        category: i.tipo === 'dieta' ? 'Dieta' : 'Treino',
        time: i.time,
        fonte: 'dieta_treino',
      }));
      const eventoEntries: CalendarEntry[] = eventos.map(e => ({
        id: `ev-${e.id}`,
        date: e.event_date,
        title: e.title,
        description: e.description,
        category: CATEGORIA_OPTIONS.find(c => c.value === e.categoria)?.label || 'Evento',
        time: e.time,
        fonte: 'evento',
      }));
      setEntries([...dietTreinoEntries, ...eventoEntries]);
    } catch { /* ok */ }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (!user) { navigate('/login', { replace: true }); return; }
    loadEntries();
    loadNotificacoes();
  }, [user, navigate, loadEntries]);

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

  const openCreateForm = () => {
    const date = selectedDate
      ? `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(selectedDate.getDate()).padStart(2, '0')}`
      : `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    setForm({ ...EMPTY_FORM, event_date: date });
    setFormError('');
    setShowForm(true);
  };

  const openEditForm = (entry: CalendarEntry) => {
    const eventoId = Number(entry.id.replace('ev-', ''));
    if (Number.isNaN(eventoId)) return;
    setForm({
      id: eventoId,
      title: entry.title,
      description: entry.description || '',
      categoria: CATEGORIA_OPTIONS.find(c => c.label === entry.category)?.value || 'evento',
      event_date: entry.date,
      time: entry.time || '',
      duration_minutes: '',
    });
    setFormError('');
    setShowForm(true);
  };

  const saveEvent = async () => {
    if (!form.title.trim()) { setFormError('Informe o título do evento.'); return; }
    if (!form.event_date) { setFormError('Informe a data do evento.'); return; }
    setSaving(true);
    setFormError('');
    try {
      const payload = {
        title: form.title.trim(),
        description: form.description.trim(),
        categoria: form.categoria,
        event_date: form.event_date,
        time: form.time || undefined,
        duration_minutes: form.duration_minutes ? Number(form.duration_minutes) : undefined,
      };
      if (form.id) {
        await atualizarEventoCalendario(form.id, payload);
      } else {
        await criarEventoCalendario(payload);
      }
      setShowForm(false);
      await loadEntries();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Não foi possível salvar o evento.');
    } finally {
      setSaving(false);
    }
  };

  const deleteEvent = async (entry: CalendarEntry) => {
    const eventoId = Number(entry.id.replace('ev-', ''));
    if (Number.isNaN(eventoId)) return;
    if (!window.confirm(`Excluir o evento "${entry.title}"?`)) return;
    try {
      await excluirEventoCalendario(eventoId);
      await loadEntries();
    } catch { /* ok */ }
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

  return (
    <main className="page-main">
      <Navbar />
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
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
                  <h3 style={{ marginBottom: '0.5rem' }}>Eventos em {selectedDate.getDate()} de {MONTHS[selectedDate.getMonth()]}</h3>
                  <button className="btn btn-primary" style={{ padding: '0.5rem 1rem', fontSize: '0.85rem' }} onClick={openCreateForm}>
                    <Icon name="plus" /> Novo evento
                  </button>
                </div>
                {selectedEntries.length === 0 ? (
                  <p className="text-muted" style={{ marginTop: '0.75rem' }}>Nenhum evento neste dia.</p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                     {selectedEntries.map(e => {
                       const imgQuery = e.category === 'Dieta'
                         ? 'healthy food meal'
                         : e.category === 'Treino'
                         ? 'workout gym training'
                         : 'calendar schedule planner';
                       return (
                       <div key={e.id} className="card eq" style={{ padding: '0.85rem' }}>
                         <img className="card-media" src={pexelsImage(imgQuery, 800, 360)} alt="" loading="lazy" onError={(ev) => handlePexelsError(ev, imgQuery, 800, 360)} />
                         <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.75rem', flexWrap: 'wrap' }}>
                          <div style={{ flex: 1, minWidth: '10rem' }}>
                            <div style={{ fontWeight: 600 }}>{e.title}</div>
                            {e.description && <p className="text-muted" style={{ marginTop: '0.25rem', fontSize: '0.85rem' }}>{e.description}</p>}
                            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginTop: '0.35rem' }}>
                              <span className="badge badge-outline">{e.category}</span>
                              {e.time && <span className="badge badge-outline"><Icon name="clock" size={14} /> {formatTime(e.time)}</span>}
                            </div>
                          </div>
                          {e.fonte === 'evento' && (
                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                              <button className="btn btn-ghost" style={{ padding: '0.35rem 0.6rem', fontSize: '0.8rem' }} onClick={() => openEditForm(e)}>
                                <Icon name="edit" size={14} />
                              </button>
                              <button className="btn btn-ghost" style={{ padding: '0.35rem 0.6rem', fontSize: '0.8rem' }} onClick={() => deleteEvent(e)}>
                                <Icon name="trash" size={14} />
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                       );
                     })}
                  </div>
                )}
              </section>
            )}
          </>
        )}
      </div>

      {showForm && (
        <div className="modal-overlay" onClick={() => { if (!saving) setShowForm(false); }}>
          <div className="modal" style={{ maxWidth: '26rem' }} onClick={e => e.stopPropagation()}>
            <h3 style={{ marginBottom: '1rem' }}>{form.id ? 'Editar evento' : 'Novo evento'}</h3>
            <div className="field">
              <label htmlFor="evTitulo">Título *</label>
              <input
                id="evTitulo"
                className="input"
                value={form.title}
                onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                placeholder="Ex.: Consulta médica"
              />
            </div>
            <div className="field">
              <label htmlFor="evDesc">Descrição</label>
              <textarea
                id="evDesc"
                className="input"
                rows={3}
                value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                placeholder="Detalhes do evento"
              />
            </div>
            <div className="grid-2">
              <div className="field">
                <label htmlFor="evData">Data *</label>
                <input
                  id="evData"
                  type="date"
                  className="input"
                  value={form.event_date}
                  onChange={e => setForm(f => ({ ...f, event_date: e.target.value }))}
                />
              </div>
              <div className="field">
                <label htmlFor="evHora">Horário</label>
                <input
                  id="evHora"
                  type="time"
                  className="input"
                  value={form.time}
                  onChange={e => setForm(f => ({ ...f, time: e.target.value }))}
                />
              </div>
            </div>
            <div className="grid-2">
              <div className="field">
                <label htmlFor="evCat">Categoria</label>
                <select id="evCat" className="select" value={form.categoria} onChange={e => setForm(f => ({ ...f, categoria: e.target.value }))}>
                  {CATEGORIA_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
              <div className="field">
                <label htmlFor="evDur">Duração (min)</label>
                <input
                  id="evDur"
                  type="number"
                  className="input"
                  min={1}
                  value={form.duration_minutes}
                  onChange={e => setForm(f => ({ ...f, duration_minutes: e.target.value }))}
                  placeholder="60"
                />
              </div>
            </div>
            {formError && <div className="alert" style={{ marginTop: '0.75rem' }}><Icon name="alertCircle" /> {formError}</div>}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.25rem' }}>
              <button className="btn btn-ghost" onClick={() => setShowForm(false)} disabled={saving}>Cancelar</button>
              <button className="btn btn-primary" onClick={saveEvent} disabled={saving}>
                {saving ? 'Salvando...' : 'Salvar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}