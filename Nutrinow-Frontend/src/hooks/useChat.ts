import { useState, useCallback, useRef, useEffect } from 'react';
import { apiRequest, type ChatMessage, type ChatResponse, ApiError, NetworkError, TimeoutError } from '../api/client';

interface ChatOptions {
  initialMessage?: string;
  sessionId?: string;
}

interface ChatSession {
  id: string;
  preview: string;
}

export function useChat(options: ChatOptions = {}) {
  const { initialMessage } = options;
  const [messages, setMessages] = useState<ChatMessage[]>(() =>
    initialMessage
      ? [{ role: 'assistant' as const, content: initialMessage }]
      : []
  );
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [isAiTyping, setIsAiTyping] = useState(false);

  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isAiTyping]);

  // Limpar erro após 6s
  useEffect(() => {
    if (!error) return;
    const id = setTimeout(() => setError(null), 6000);
    return () => clearTimeout(id);
  }, [error]);

  const loadSessions = useCallback(async () => {
    try {
      const data = await apiRequest<ChatSession[]>('/chat_sessions');
      setSessions(data || []);
    } catch { /* silencioso */ }
  }, []);

  const sendMessage = useCallback(async (text?: string) => {
    const content = (text ?? input).trim();
    if (!content || loading) return;

    setInput('');
    setError(null);
    setMessages(prev => [...prev, { role: 'user', content }]);
    setLoading(true);
    setIsAiTyping(true);

    try {
      const res = await apiRequest<ChatResponse>('/chat', {
        method: 'POST',
        body: { message: content },
        timeout: 30000,
      });
      setMessages(prev => [...prev, { role: 'assistant', content: res.response }]);
    } catch (err: unknown) {
      if (err instanceof TimeoutError) {
        setError('A IA demorou para responder. Tente novamente.');
      } else if (err instanceof NetworkError) {
        setError('Sem conexão com o servidor. Verifique sua internet.');
      } else if (err instanceof ApiError) {
        if (err.status === 429) {
          setError('Muitas requisições. Aguarde um momento e tente novamente.');
        } else if (err.status === 503) {
          setError('A IA está temporariamente indisponível. Tente mais tarde.');
        } else {
          setError(err.message || 'Erro ao enviar mensagem');
        }
      } else {
        setError('Erro inesperado. Tente novamente.');
      }
      setMessages(prev => [
        ...prev,
        { role: 'assistant', content: 'Desculpe, ocorreu um erro ao processar sua mensagem.' },
      ]);
    } finally {
      setLoading(false);
      setIsAiTyping(false);
      inputRef.current?.focus();
    }
  }, [input, loading]);

  const newConversation = useCallback(() => {
    setMessages(
      initialMessage
        ? [{ role: 'assistant', content: initialMessage }]
        : []
    );
    setError(null);
  }, [initialMessage]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
      }
    },
    [sendMessage]
  );

  return {
    messages,
    input,
    setInput,
    loading,
    error,
    sessions,
    showHistory,
    setShowHistory,
    isAiTyping,
    bottomRef,
    inputRef,
    sendMessage,
    newConversation,
    loadSessions,
    handleKeyDown,
  };
}
