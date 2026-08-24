import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useChat } from '../hooks/useChat';
import MessageList from '../components/MessageList';
import ChatInput from '../components/ChatInput';
import Navbar from '../components/Navbar';
import Icon from '../components/Icon';

const SUGGESTIONS = [
  'Monte um cardápio de emagrecimento para 1 semana',
  'Sugira um treino de força para fazer em casa',
  'Quais alimentos têm mais proteína?',
  'Como melhorar minha alimentação?',
];

export default function Chat() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const {
    messages, input, setInput, loading, error,
    sessions, activeSessionId, isAiTyping, conversationStarted,
    bottomRef, inputRef, sendMessage, sendImage, newConversation,
    loadSession, deleteSession, loadSessions, handleKeyDown,
  } = useChat({ initialMessage: 'Olá! Sou a NutriAI, sua assistente de nutrição e treinos. Como posso ajudar?' });

  const [query, setQuery] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    if (!user) { navigate('/login', { replace: true }); return; }
    loadSessions();
  }, []);

  const filtered = sessions.filter(s =>
    (s.preview || s.title || '').toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div className="chat-app">
      <aside className={`chat-sidebar ${sidebarOpen ? 'open' : ''}`} inert={!sidebarOpen}>
        <div className="chat-sidebar-header">
          <button
            className="btn btn-primary chat-new-btn"
            onClick={() => { newConversation(); setSidebarOpen(false); }}
          >
            <Icon name="plus" size={16} /> Nova conversa
          </button>
          <div className="chat-search">
            <Icon name="search" size={16} />
            <input
              type="text"
              placeholder="Buscar conversas..."
              value={query}
              onChange={e => setQuery(e.target.value)}
              aria-label="Buscar conversas"
            />
          </div>
        </div>

        <div className="chat-session-list">
          {filtered.length === 0 ? (
            <p className="text-muted" style={{ fontSize: '0.85rem', padding: '0.5rem' }}>
              {query ? 'Nenhuma conversa encontrada.' : 'Nenhuma conversa salva.'}
            </p>
          ) : (
            filtered.map(s => (
              <div key={s.session_id} className="history-item-row">
                <button
                  className={`history-item ${activeSessionId === s.session_id ? 'active' : ''}`}
                  onClick={() => { loadSession(s.session_id); setSidebarOpen(false); }}
                  title={s.title || s.preview}
                >
                  <Icon name="message" size={14} />
                  <span className="history-item-text">{s.preview}</span>
                </button>
                <button
                  className="history-delete"
                  onClick={() => deleteSession(s.session_id)}
                  aria-label="Excluir conversa"
                >
                  <Icon name="trash" size={14} />
                </button>
              </div>
            ))
          )}
        </div>
      </aside>

      {sidebarOpen && (
        <div className="chat-overlay" onClick={() => setSidebarOpen(false)} aria-hidden />
      )}

      <main className="chat-main-area">
        <div className="chat-topbar">
          <button
            className="icon-btn chat-menu-btn"
            onClick={() => setSidebarOpen(true)}
            aria-label="Abrir histórico de conversas"
          >
            <Icon name="menu" size={18} />
          </button>
          <Navbar />
        </div>

        {error && (
          <div className="alert" role="alert" style={{ margin: '0.5rem 1rem', flexShrink: 0 }}>
            <Icon name="alert" size={16} /> {error}
          </div>
        )}

        <MessageList messages={messages} isAiTyping={isAiTyping} bottomRef={bottomRef} />

        {!conversationStarted && (
          <div className="chat-suggestions" aria-label="Sugestões de mensagens">
            <span className="chat-suggestions-label">Tente perguntar:</span>
            <div className="chat-suggestions-row">
              {SUGGESTIONS.map(s => (
                <button
                  key={s}
                  type="button"
                  className="chat-suggestion"
                  onClick={() => sendMessage(s)}
                  disabled={loading}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        <ChatInput
          value={input}
          onChange={setInput}
          onSend={() => sendMessage()}
          onImage={(file) => sendImage(file)}
          onKeyDown={handleKeyDown}
          disabled={loading}
          inputRef={inputRef}
        />
      </main>
    </div>
  );
}
