import { memo } from 'react';
import Icon from './Icon';

interface ChatInputProps {
  value: string;
  onChange: (value: string) => void;
  onSend: () => void;
  onKeyDown: (e: React.KeyboardEvent) => void;
  disabled: boolean;
  inputRef: React.RefObject<HTMLInputElement | null>;
}

function ChatInput({ value, onChange, onSend, onKeyDown, disabled, inputRef }: ChatInputProps) {
  return (
    <div className="chat-input-bar">
      <input
        ref={inputRef}
        className="input chat-input"
        type="text"
        placeholder="Digite sua mensagem..."
        value={value}
        onChange={e => onChange(e.target.value)}
        onKeyDown={onKeyDown}
        disabled={disabled}
        aria-label="Mensagem"
        autoComplete="off"
      />
      <button
        className="btn btn-primary"
        onClick={onSend}
        disabled={disabled || !value.trim()}
        aria-label="Enviar mensagem"
      >
        <Icon name="send" size={18} />
      </button>
    </div>
  );
}

export default memo(ChatInput);
