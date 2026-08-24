import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiRequest, ApiError } from '../api/client';
import Icon from './Icon';

export default function PremiumModal() {
  const navigate = useNavigate();
  const [paying, setPaying] = useState(false);
  const [error, setError] = useState('');
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') navigate('/');
    };
    document.addEventListener('keydown', onKey);
    dialogRef.current?.focus();
    return () => document.removeEventListener('keydown', onKey);
  }, [navigate]);

  const handlePay = async () => {
    setPaying(true);
    setError('');
    try {
      const data = await apiRequest<{ checkout_url: string }>('/billing/checkout', { method: 'POST' });
      if (data.checkout_url) window.location.href = data.checkout_url;
    } catch (err: unknown) {
      setError(err instanceof ApiError ? err.message : 'Falha ao iniciar pagamento. Tente novamente.');
      setPaying(false);
    }
  };

  return (
    <div
      className="modal-overlay"
      onClick={() => navigate('/')}
      role="presentation"
    >
      <div
        ref={dialogRef}
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="premium-modal-title"
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <h2 id="premium-modal-title">Recurso Premium</h2>
        </div>
        <div className="modal-body">
          <p>Este recurso está disponível apenas para contas premium.</p>
          <p className="text-muted" style={{ marginTop: '0.5rem' }}>
            Pague <strong>R$ 29,90 único</strong> e tenha acesso a dashboard, dietas, treinos,
            calendário inteligente e muito mais!
          </p>
          {error && (
            <div className="alert" style={{ marginTop: '0.75rem' }}><Icon name="alertCircle" /> {error}</div>
          )}
        </div>
        <div className="modal-actions">
          <button className="btn btn-secondary" onClick={() => navigate('/')} disabled={paying}>
            Fechar
          </button>
          <button className="btn btn-primary" onClick={handlePay} disabled={paying}>
            {paying ? 'Aguarde...' : 'Pagar'}
          </button>
        </div>
      </div>
    </div>
  );
}
