import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { getNotificacoes, marcarNotificacaoLida, ApiError, type Notificacao } from '../api/client';
import { useAuth } from '../context/AuthContext';
import Icon from './Icon';

export default function NotificacaoBell() {
  const [notificacoes, setNotificacoes] = useState<Notificacao[]>([]);
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const { user } = useAuth();

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    let interval: ReturnType<typeof setInterval> | undefined;
    const carregar = async () => {
      try {
        const lista = await getNotificacoes();
        if (!cancelled) setNotificacoes(lista);
      } catch (err) {
        if (err instanceof ApiError && err.status === 401 && interval) clearInterval(interval);
      }
    };
    carregar();
    interval = setInterval(carregar, 60000);
    return () => { cancelled = true; if (interval) clearInterval(interval); };
  }, [user]);

  useEffect(() => {
    if (!open) return;
    const onDocClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDocClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDocClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const naoLidas = notificacoes.filter(n => !n.lida).length;

  const formatarData = (value?: string) => {
    if (!value) return 'Data não disponível';
    const data = new Date(value);
    if (Number.isNaN(data.getTime())) return 'Data inválida';
    return data.toLocaleString('pt-BR');
  };

  const marcarLida = async (id: number) => {
    setNotificacoes(prev => prev.map(n => (n.id === id ? { ...n, lida: 1 } : n)));
    try {
      await marcarNotificacaoLida(id);
    } catch { /* ok */ }
  };

  return (
    <div className="notif-bell" ref={containerRef} onMouseLeave={() => setOpen(false)}>
      <button
        className="btn btn-ghost notif-bell-btn"
        onClick={() => setOpen(o => !o)}
        aria-label="Notificações"
        aria-haspopup="true"
        aria-expanded={open}
        style={{ fontSize: '0.85rem', position: 'relative' }}
      >
        <Icon name="bell" size={16} />
        {naoLidas > 0 && <span className="notif-count">{naoLidas > 9 ? '9+' : naoLidas}</span>}
      </button>
      {open && (
        <div className="notif-dropdown">
          {notificacoes.length === 0 ? (
            <div className="notif-empty">Nenhum lembrete</div>
          ) : (
            notificacoes.slice(0, 8).map(n => (
              <button
                key={n.id}
                className={`notif-item${n.lida ? ' read' : ''}`}
                onClick={() => marcarLida(n.id)}
              >
                <div className="notif-item-title">{n.titulo}</div>
                <div className="notif-item-meta">
                  <span className="badge badge-outline">{n.tipo === 'dieta' ? 'Dieta' : 'Treino'}</span>
                  <span>{formatarData(n.agendado_para)}</span>
                </div>
              </button>
            ))
          )}
          <Link to="/calendario" className="notif-ver-todos" onClick={() => setOpen(false)}>
            Ver todos
          </Link>
        </div>
      )}
    </div>
  );
}
