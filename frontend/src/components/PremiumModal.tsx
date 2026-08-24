import { useNavigate } from 'react-router-dom';
import { apiRequest } from '../api/client';

export default function PremiumModal() {
  const navigate = useNavigate();

  const handlePay = async () => {
    try {
      const data = await apiRequest<{ checkout_url: string }>('/billing/checkout', { method: 'POST' });
      if (data.checkout_url) window.location.href = data.checkout_url;
    } catch {
      alert('Falha ao iniciar pagamento. Tente novamente.');
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal">
        <div className="modal-header">
          <h2>Recurso Premium</h2>
        </div>
        <div className="modal-body">
          <p>Este recurso está disponível apenas para contas premium.</p>
          <p className="text-muted" style={{ marginTop: '0.5rem' }}>
            Pague <strong>R$ 29,90 único</strong> e tenha acesso a dashboard, dietas, treinos,
            calendário inteligente e muito mais!
          </p>
        </div>
        <div className="modal-actions">
          <button className="btn btn-secondary" onClick={() => navigate('/')}>
            Fechar
          </button>
          <button className="btn btn-primary" onClick={handlePay}>
            Pagar
          </button>
        </div>
      </div>
    </div>
  );
}
