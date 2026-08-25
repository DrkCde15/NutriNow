import { memo } from 'react';
import type { ChatMessage } from '../api/client';
import Icon from './Icon';
import Markdown from './Markdown';

interface MessageListProps {
  messages: ChatMessage[];
  isAiTyping: boolean;
  bottomRef: React.RefObject<HTMLDivElement | null>;
}

function MessageItem({ message }: { message: ChatMessage }) {
  return (
    <div className={`message ${message.role}`}>
      {message.role === 'assistant' && (
        <div className="message-avatar" aria-hidden>
          <Icon name="sparkles" size={16} />
        </div>
      )}
      <div className="message-content">
        {message.image && (
          <img
            src={message.image}
            alt="Imagem enviada"
            className="message-image"
            loading="lazy"
            onError={(e) => { e.currentTarget.style.display = 'none'; }}
          />
        )}
        {message.role === 'assistant' ? (
          <Markdown content={message.content} />
        ) : (
          message.content
        )}
      </div>
    </div>
  );
}

const MessageItemMemo = memo(MessageItem);

function TypingIndicator() {
  return (
    <div className="message assistant" role="status" aria-label="IA está digitando">
      <div className="message-avatar" aria-hidden>
        <Icon name="sparkles" size={16} />
      </div>
      <div className="message-content">
        <div className="typing-indicator" aria-hidden>
          <span /><span /><span />
        </div>
      </div>
    </div>
  );
}

export default function MessageList({ messages, isAiTyping, bottomRef }: MessageListProps) {
  return (
    <div className="chat-messages" role="log" aria-label="Histórico da conversa">
      {messages.length === 0 && (
        <div className="chat-empty" style={{ textAlign: 'center', padding: '2rem', color: 'var(--muted-foreground)' }}>
          <Icon name="message" size={32} />
          <p style={{ marginTop: '0.5rem' }}>Nenhuma mensagem ainda. Comece a conversa!</p>
        </div>
      )}
      {messages.map((msg, i) => (
        <MessageItemMemo key={`${msg.role}-${i}`} message={msg} />
      ))}
      {isAiTyping && <TypingIndicator />}
      <div ref={bottomRef} />
    </div>
  );
}
