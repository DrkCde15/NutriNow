import { useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { apiRequest, ApiError } from '../../api/client';
import { useForm, validators } from '../../hooks/useForm';
import AuthLayout from '../../components/AuthLayout';
import Icon from '../../components/Icon';

export default function ResetSenha() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';
  const [apiError, setApiError] = useState('');
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);

  const { values, errors, touched, handleChange, handleBlur, validateAll } = useForm({
    novaSenha: { initial: '', rules: [validators.required('Informe a nova senha'), validators.password()] },
    confirm: { initial: '', rules: [validators.required('Confirme a senha'), validators.match('novaSenha', 'As senhas não conferem')] },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateAll()) return;
    setApiError('');
    setLoading(true);
    try {
      await apiRequest('/redefinir-senha', { method: 'POST', body: { token, nova_senha: values.novaSenha } });
      setDone(true);
    } catch (err: unknown) {
      setApiError(err instanceof ApiError ? err.message : 'Erro ao redefinir senha');
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <AuthLayout title="Link inválido" subtitle="O link de redefinição está ausente ou expirou." footer={undefined}>
        <Link to="/login" className="btn btn-primary"><Icon name="arrowLeft" /> Voltar para o login</Link>
      </AuthLayout>
    );
  }

  if (done) {
    return (
      <AuthLayout title="Senha redefinida!" subtitle="Sua senha foi alterada com sucesso." footer={undefined}>
        <div style={{ textAlign: 'center', marginTop: '1.5rem' }}>
          <Icon name="checkCircle" size={48} />
          <p className="text-muted" style={{ marginTop: '1rem' }}>Agora você já pode entrar com a nova senha.</p>
          <Link to="/login" className="btn btn-primary" style={{ marginTop: '1.5rem' }}><Icon name="login" /> Fazer login</Link>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      title="Redefinir senha"
      subtitle="Escolha uma nova senha para sua conta."
      footer={<Link to="/login" className="text-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: '.35rem', fontWeight: 800 }}><Icon name="arrowLeft" /> Voltar para o login</Link>}
    >
      <form className="form" onSubmit={handleSubmit} noValidate>
        <div className="field">
          <label htmlFor="reset-novaSenha">Nova senha</label>
          <input
            id="reset-novaSenha"
            className={`input${touched.novaSenha && errors.novaSenha ? ' input-error' : ''}`}
            type="password"
            placeholder="Mínimo 10 caracteres"
            value={values.novaSenha}
            onChange={handleChange('novaSenha')}
            onBlur={handleBlur('novaSenha')}
            autoComplete="new-password"
            aria-invalid={!!(touched.novaSenha && errors.novaSenha)}
            aria-describedby={errors.novaSenha ? 'reset-novaSenha-err' : undefined}
          />
          {touched.novaSenha && errors.novaSenha && (
            <span id="reset-novaSenha-err" className="field-error" role="alert">{errors.novaSenha}</span>
          )}
          <p className="field-hint">A senha precisa ter ao menos 10 caracteres, com letra maiúscula, minúscula e um número.</p>
        </div>
        <div className="field">
          <label htmlFor="reset-confirm">Confirmar nova senha</label>
          <input
            id="reset-confirm"
            className={`input${touched.confirm && errors.confirm ? ' input-error' : ''}`}
            type="password"
            placeholder="Repita a senha"
            value={values.confirm}
            onChange={handleChange('confirm')}
            onBlur={handleBlur('confirm')}
            autoComplete="new-password"
            aria-invalid={!!(touched.confirm && errors.confirm)}
            aria-describedby={errors.confirm ? 'reset-confirm-err' : undefined}
          />
          {touched.confirm && errors.confirm && (
            <span id="reset-confirm-err" className="field-error" role="alert">{errors.confirm}</span>
          )}
        </div>
        {apiError && <div className="alert" role="alert"><Icon name="alert" /> {apiError}</div>}
        <button className="btn btn-primary" type="submit" disabled={loading}>
          {loading ? 'Redefinindo...' : 'Redefinir senha'}
        </button>
      </form>
    </AuthLayout>
  );
}
