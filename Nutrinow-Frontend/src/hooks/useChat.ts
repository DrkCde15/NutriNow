import { useState, useCallback, useRef, useEffect } from 'react';
import { apiRequest, type ChatMessage, type ChatResponse, ApiError, NetworkError, TimeoutError } from '../api/client';

interface ChatOptions {
  initialMessage?: string;
  sessionId?: string;
}

interface ChatSession {
  session_id: string;
  title?: string;
  preview: string;
  updated_at?: string;
  message_count?: number;
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
  const [conversationStarted, setConversationStarted] = useState(false);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
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
      const data = await apiRequest<{ success: boolean; sessions: ChatSession[] }>('/chat_sessions');
      setSessions(data?.sessions || []);
    } catch { /* silencioso */ }
  }, []);

  const sendMessage = useCallback(async (text?: string) => {
    const content = (text ?? input).trim();
    if (!content || loading) return;

    setConversationStarted(true);
    setInput('');
    setError(null);
    setMessages(prev => [...prev, { role: 'user', content }]);
    setLoading(true);
    setIsAiTyping(true);

    try {
      const res = await apiRequest<ChatResponse>('/chat', {
        method: 'POST',
        body: { message: content },
        sessionId: activeSessionId ?? undefined,
        timeout: 30000,
      });
      if (res.session_id) setActiveSessionId(res.session_id);
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
    setActiveSessionId(null);
    setConversationStarted(false);
    setError(null);
  }, [initialMessage]);

  const loadSession = useCallback(async (sessionId: string) => {
    if (!sessionId) return;
    setError(null);
    setActiveSessionId(sessionId);
    try {
      const data = await apiRequest<{ history: ChatMessage[] }>(
        `/chat_history?session_id=${encodeURIComponent(sessionId)}`
      );
      const history = (data?.history || []).map(m => ({
        role: m.role,
        content: m.content,
      }));
      setMessages(
        history.length
          ? history
          : (initialMessage ? [{ role: 'assistant' as const, content: initialMessage }] : [])
      );
      if (history.length) setConversationStarted(true);
    } catch {
      setError('Não foi possível carregar esta conversa.');
    }
  }, [initialMessage]);

  const deleteSession = useCallback(async (sessionId: string) => {
    try {
      await apiRequest(`/chat_sessions/${encodeURIComponent(sessionId)}`, { method: 'DELETE' });
      setSessions(prev => prev.filter(s => s.session_id !== sessionId));
      if (activeSessionId === sessionId) newConversation();
    } catch {
      setError('Não foi possível excluir esta conversa.');
    }
  }, [activeSessionId, newConversation]);

  const sendImage = useCallback(async (file: File) => {
    if (!file || loading) return;

    setConversationStarted(true);
    setError(null);
    const previewUrl = URL.createObjectURL(file);
    setMessages(prev => [...prev, { role: 'user', content: 'Imagem enviada', image: previewUrl }]);
    setLoading(true);
    setIsAiTyping(true);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('message_type', 'human');
      const res = await apiRequest<{ success: boolean; session_id?: string; response: string }>(
        '/analyze_image',
        {
          method: 'POST',
          body: formData,
          sessionId: activeSessionId ?? undefined,
          timeout: 30000,
        }
      );
      if (res.session_id) setActiveSessionId(res.session_id);
      setMessages(prev => [...prev, { role: 'assistant', content: res.response }]);
    } catch (err: unknown) {
      if (err instanceof TimeoutError) {
        setError('A IA demorou para analisar a imagem. Tente novamente.');
      } else if (err instanceof NetworkError) {
        setError('Sem conexão com o servidor. Verifique sua internet.');
      } else if (err instanceof ApiError) {
        setError(err.message || 'Erro ao enviar imagem');
      } else {
        setError('Erro inesperado ao enviar imagem. Tente novamente.');
      }
      setMessages(prev => prev.filter(m => m.image !== previewUrl));
    } finally {
      setLoading(false);
      setIsAiTyping(false);
      inputRef.current?.focus();
    }
  }, [loading, activeSessionId]);

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
    conversationStarted,
    activeSessionId,
    isAiTyping,
    bottomRef,
    inputRef,
    sendMessage,
    newConversation,
    loadSession,
    deleteSession,
    loadSessions,
    sendImage,
    handleKeyDown,
  };
}
