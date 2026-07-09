import { memo, useRef } from 'react';
import Icon from './Icon';

interface ChatInputProps {
  value: string;
  onChange: (value: string) => void;
  onSend: () => void;
  onImage: (file: File) => void;
  onKeyDown: (e: React.KeyboardEvent) => void;
  disabled: boolean;
  inputRef: React.RefObject<HTMLInputElement | null>;
}

function ChatInput({ value, onChange, onSend, onImage, onKeyDown, disabled, inputRef }: ChatInputProps) {
  const fileRef = useRef<HTMLInputElement>(null);

  return (
    <div className="chat-input-bar">
      <button
        type="button"
        className="btn btn-ghost chat-image-btn"
        onClick={() => fileRef.current?.click()}
        disabled={disabled}
        aria-label="Enviar imagem"
        title="Enviar imagem"
      >
        <Icon name="image" size={18} />
      </button>
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        hidden
        onChange={e => {
          const file = e.target.files?.[0];
          if (file) onImage(file);
          e.target.value = '';
        }}
      />
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
