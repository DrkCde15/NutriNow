import { useEffect, useRef, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { defaultAuthenticatedRoute } from '../../api/client';
import { useForm, validators } from '../../hooks/useForm';
import AuthLayout from '../../components/AuthLayout';
import Icon, { GoogleLogo } from '../../components/Icon';

export default function Login() {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const [showSenha, setShowSenha] = useState(false);
  const [loading, setLoading] = useState(false);
  const submittingRef = useRef(false);

  const { values, errors, touched, handleChange, handleBlur, validateAll, setFieldError } = useForm({
    email: { initial: '', rules: [validators.required('Informe o email'), validators.email()] },
    senha: { initial: '', rules: [validators.required('Informe a senha')] },
  });

  useEffect(() => {
    if (user) navigate(defaultAuthenticatedRoute(user), { replace: true });
  }, [user, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateAll() || submittingRef.current) return;
    submittingRef.current = true;
    setLoading(true);

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);

      const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: values.email, senha: values.senha }),
        credentials: 'include',
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (!res.ok) {
        let errorMsg = `Erro ${res.status}`;
        try {
          const errData = await res.json();
          errorMsg = errData.error || errData.message || errorMsg;
        } catch { /* ignore parse error */ }
        setFieldError('senha', errorMsg);
        return;
      }

      const data = await res.json();
      login(data.access_token || data.token || '', data.user, data.refresh_token);
    } catch (err: unknown) {
      const msg = err instanceof DOMException && err.name === 'AbortError'
        ? 'O servidor demorou para responder. Tente novamente.'
        : 'Erro ao entrar. Verifique sua conexão e tente novamente.';
      setFieldError('senha', msg);
    } finally {
      submittingRef.current = false;
      setLoading(false);
    }
  };

  const handleGoogle = async () => {
    try {
      const res = await fetch('/api/auth/login', { method: 'GET', credentials: 'include' });
      const data = await res.json();
      if (data.auth_url) window.location.href = data.auth_url;
    } catch {
      setFieldError('email', 'Erro ao conectar com o Google');
    }
  };

  return (
    <AuthLayout
      title="Bem-vindo de volta"
      subtitle="Entre na sua conta para continuar sua jornada."
      footer={<>Ainda não tem conta? <Link to="/cadastro" className="text-primary" style={{ fontWeight: 800 }}>Cadastre-se grátis</Link></>}
    >
      <form className="form" onSubmit={handleSubmit} noValidate>
        <div className="field">
          <label htmlFor="login-email">Email</label>
          <input
            id="login-email"
            className={`input${touched.email && errors.email ? ' input-error' : ''}`}
            type="email"
            placeholder="seu@email.com"
            autoComplete="email"
            value={values.email}
            onChange={handleChange('email')}
            onBlur={handleBlur('email')}
            aria-invalid={!!(touched.email && errors.email)}
            aria-describedby={errors.email ? 'login-email-err' : undefined}
          />
          {touched.email && errors.email && (
            <span id="login-email-err" className="field-error" role="alert">{errors.email}</span>
          )}
        </div>
        <div className="field">
          <label htmlFor="login-senha">Senha</label>
          <div className="input-wrap">
            <input
              id="login-senha"
              className={`input${touched.senha && errors.senha ? ' input-error' : ''}`}
              type={showSenha ? 'text' : 'password'}
              placeholder="********"
              autoComplete="current-password"
              value={values.senha}
              onChange={handleChange('senha')}
              onBlur={handleBlur('senha')}
              aria-invalid={!!(touched.senha && errors.senha)}
              aria-describedby={errors.senha ? 'login-senha-err' : undefined}
            />
            <button type="button" className="password-toggle" onClick={() => setShowSenha(v => !v)} aria-label={showSenha ? 'Ocultar senha' : 'Mostrar senha'} aria-pressed={showSenha}>
              <Icon name={showSenha ? 'eyeOff' : 'eye'} size={18} />
            </button>
          </div>
          {touched.senha && errors.senha && (
            <span id="login-senha-err" className="field-error" role="alert">{errors.senha}</span>
          )}
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <Link to="/esqueci-senha" className="text-primary" style={{ fontSize: '.9rem', fontWeight: 700 }}>Esqueci minha senha</Link>
        </div>
        <button className="btn btn-primary" type="submit" disabled={loading}>
          {loading ? 'Entrando...' : <><Icon name="login" /> Entrar</>}
        </button>
        <div className="divider"><span>Ou continue com</span></div>
        <button className="btn btn-secondary" type="button" onClick={handleGoogle}>
          <GoogleLogo /> Google
        </button>
      </form>
    </AuthLayout>
  );
}
