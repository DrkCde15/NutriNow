import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getNotificacoes, marcarNotificacaoLida, type Notificacao } from '../api/client';
import Icon from './Icon';

export default function NotificacaoBell() {
  const [notificacoes, setNotificacoes] = useState<Notificacao[]>([]);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const carregar = async () => {
      try {
        setNotificacoes(await getNotificacoes());
      } catch { /* ok */ }
    };
    carregar();
    const interval = setInterval(carregar, 60000);
    return () => clearInterval(interval);
  }, []);

  const naoLidas = notificacoes.filter(n => !n.lida).length;

  const marcarLida = async (id: number) => {
    setNotificacoes(prev => prev.map(n => (n.id === id ? { ...n, lida: 1 } : n)));
    try {
      await marcarNotificacaoLida(id);
    } catch { /* ok */ }
  };

  return (
    <div className="notif-bell" onMouseLeave={() => setOpen(false)}>
      <button
        className="btn btn-ghost notif-bell-btn"
        onClick={() => setOpen(o => !o)}
        aria-label="Notificações"
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
                  <span>{new Date(n.agendado_para).toLocaleString('pt-BR')}</span>
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
