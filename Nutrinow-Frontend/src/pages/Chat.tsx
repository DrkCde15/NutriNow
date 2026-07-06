import { useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useChat } from '../hooks/useChat';
import MessageList from '../components/MessageList';
import ChatInput from '../components/ChatInput';
import Icon from '../components/Icon';

export default function Chat() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const {
    messages, input, setInput, loading, error,
    sessions, showHistory, setShowHistory, isAiTyping,
    bottomRef, inputRef, sendMessage, newConversation,
    loadSessions, handleKeyDown,
  } = useChat({ initialMessage: 'Olá! Sou a NutriAI, sua assistente de nutrição e treinos. Como posso ajudar?' });

  useEffect(() => {
    if (!user) { navigate('/login', { replace: true }); return; }
    loadSessions();
  }, []);

  const role = user?.role;
  const showPacientes = role === 'nutritionist' || role === 'personal_trainer';

  return (
    <main className="page-main">
      <nav className="navbar" role="navigation" aria-label="Navegação principal">
        <Link to="/" className="brand" aria-label="Ir para o início">
          <span className="brand-logo"><img src="/logo.png" alt="" width="32" height="32" /></span>
          <span>Nutri<span className="text-primary">Now</span></span>
        </Link>
        <div className="nav-links">
          <Link to="/calendario" className="nav-link">Calendário</Link>
          <Link to="/dieta" className="nav-link">Dieta</Link>
          <Link to="/treino" className="nav-link">Treino</Link>
          <button className="btn btn-ghost" onClick={newConversation} style={{ fontSize: '0.85rem' }}>
            <Icon name="plus" size={16} /> Nova conversa
          </button>
          <button
            className="btn btn-ghost"
            onClick={() => setShowHistory(prev => !prev)}
            style={{ fontSize: '0.85rem' }}
            aria-expanded={showHistory}
            aria-controls="chat-history-panel"
          >
            <Icon name="history" size={16} /> Histórico
          </button>
          <Link to="/dashboard" className="nav-link">Dashboard</Link>
          {showPacientes && <Link to="/pacientes" className="nav-link">Pacientes</Link>}
          <button className="btn btn-ghost" onClick={logout} style={{ fontSize: '0.85rem' }}>
            <Icon name="logout" size={16} /> Sair
          </button>
        </div>
      </nav>

      <div className="chat-layout">
        {showHistory && (
          <aside id="chat-history-panel" className="chat-history" role="complementary" aria-label="Histórico de conversas">
            <h3 style={{ margin: '0 0 1rem', fontSize: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              Histórico
              <button className="btn btn-ghost" onClick={() => setShowHistory(false)} style={{ padding: '0.25rem' }} aria-label="Fechar histórico">
                <Icon name="x" size={16} />
              </button>
            </h3>
            {sessions.length === 0 ? (
              <p className="text-muted" style={{ fontSize: '0.85rem' }}>Nenhuma conversa salva.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                {sessions.map(s => (
                  <button key={s.id} className="history-item" onClick={() => { /* TODO: carregar conversa */ }}>
                    {s.preview}
                  </button>
                ))}
              </div>
            )}
          </aside>
        )}

        <div className="chat-container">
          {error && (
            <div className="alert" role="alert" style={{ margin: '0.5rem 1rem', flexShrink: 0 }}>
              <Icon name="alert" size={16} /> {error}
            </div>
          )}

          <MessageList messages={messages} isAiTyping={isAiTyping} bottomRef={bottomRef} />

          <ChatInput
            value={input}
            onChange={setInput}
            onSend={() => sendMessage()}
            onKeyDown={handleKeyDown}
            disabled={loading}
            inputRef={inputRef}
          />
        </div>
      </div>
    </main>
  );
}
