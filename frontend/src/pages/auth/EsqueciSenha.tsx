import { useState } from 'react';
import { Link } from 'react-router-dom';
import { apiRequest, ApiError } from '../../api/client';
import { useForm, validators } from '../../hooks/useForm';
import AuthLayout from '../../components/AuthLayout';
import Icon from '../../components/Icon';

export default function EsqueciSenha() {
  const { values, errors, touched, handleChange, handleBlur, validateAll } = useForm({
    email: { initial: '', rules: [validators.required('Informe o email'), validators.email()] },
  });
  const [apiError, setApiError] = useState('');
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateAll()) return;
    setApiError('');
    setLoading(true);
    try {
      await apiRequest('/esqueci-senha', { method: 'POST', body: { email: values.email }, token: '' });
      setSent(true);
    } catch (err: unknown) {
      setApiError(err instanceof ApiError ? err.message : 'Falha ao solicitar recuperação');
    } finally {
      setLoading(false);
    }
  };

  if (sent) {
    return (
      <AuthLayout title="Link enviado!" subtitle="" footer={undefined}>
        <div style={{ textAlign: 'center', marginTop: '2rem' }}>
          <Icon name="checkCircle" size={48} />
          <p className="text-muted" style={{ marginTop: '1rem' }}>
            Se o email informado estiver cadastrado, você receberá um link em instantes.
          </p>
          <Link to="/login" className="text-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: '.35rem', fontWeight: 800, marginTop: '1.5rem' }}>
            <Icon name="arrowLeft" /> Voltar para o login
          </Link>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      title="Recuperar senha"
      subtitle="Enviaremos um link para você definir uma nova senha."
      footer={<Link to="/login" className="text-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: '.35rem', fontWeight: 800 }}>
        <Icon name="arrowLeft" /> Voltar para o login
      </Link>}
    >
      <form className="form" onSubmit={handleSubmit} noValidate>
        <div className="field">
          <label htmlFor="esq-email">Email cadastrado</label>
          <input
            id="esq-email"
            className={`input${touched.email && errors.email ? ' input-error' : ''}`}
            type="email"
            placeholder="seu@email.com"
            autoComplete="email"
            value={values.email}
            onChange={handleChange('email')}
            onBlur={handleBlur('email')}
            aria-invalid={!!(touched.email && errors.email)}
            aria-describedby={errors.email ? 'esq-email-err' : undefined}
          />
          {touched.email && errors.email && (
            <span id="esq-email-err" className="field-error" role="alert">{errors.email}</span>
          )}
        </div>
        {apiError && <div className="alert" role="alert"><Icon name="alert" /> {apiError}</div>}
        <button className="btn btn-primary" type="submit" disabled={loading}>
          {loading ? 'Enviando...' : <><Icon name="send" /> Enviar link de recuperação</>}
        </button>
      </form>
    </AuthLayout>
  );
}
