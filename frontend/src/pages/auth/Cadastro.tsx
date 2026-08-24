import { useState, useEffect } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { apiRequest, defaultAuthenticatedRoute, ApiError, validarConvite, type ConviteInfo } from '../../api/client';
import { useForm, validators } from '../../hooks/useForm';
import AuthLayout from '../../components/AuthLayout';
import Icon, { GoogleLogo } from '../../components/Icon';

export default function Cadastro() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const conviteToken = searchParams.get('convite') || '';
  const [convite, setConvite] = useState<ConviteInfo | null>(null);
  const [apiError, setApiError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showSenha, setShowSenha] = useState(false);
  const [conviteFotoError, setConviteFotoError] = useState(false);

  useEffect(() => {
    if (conviteToken) {
      validarConvite(conviteToken).then(setConvite);
    }
  }, [conviteToken]);

  const { values, errors, touched, handleChange, handleBlur, validateAll } = useForm({
    nome: { initial: '', rules: [validators.required('Informe o nome')] },
    sobrenome: { initial: '' },
    dataNascimento: { initial: '' },
    genero: { initial: 'Masculino' },
    email: { initial: '', rules: [validators.required('Informe o email'), validators.email()] },
    senha: { initial: '', rules: [validators.required('Informe a senha'), validators.password()] },
    role: { initial: 'user' },
    meta: { initial: '' },
    jaTreinou: { initial: 'Nunca treinou' },
    altura: { initial: '' },
    peso: { initial: '' },
  });

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!validateAll()) return;
    setApiError('');

    const altura = values.altura ? Number(values.altura) : undefined;
    const peso = values.peso ? Number(values.peso) : undefined;

    setLoading(true);
    try {
      const data = await apiRequest<{ access_token?: string; token?: string; user?: any }>('/cadastro', {
        method: 'POST',
        body: {
          nome: values.nome, sobrenome: values.sobrenome,
          data_nascimento: values.dataNascimento,
          genero: values.genero, email: values.email, senha: values.senha,
          meta: values.meta || 'Não definida',
          altura, peso,
          ja_treinou: values.jaTreinou || 'Nunca treinou',
          role: values.role,
          convite: conviteToken || undefined,
        },
        token: '',
      });

      if (data.access_token || data.token) {
        login(data.access_token || data.token || '', data.user);
      } else {
        const loginData = await apiRequest<{ access_token: string; user: any }>('/login', {
          method: 'POST', body: { email: values.email, senha: values.senha }, token: '',
        });
        login(loginData.access_token, loginData.user);
      }
      navigate(defaultAuthenticatedRoute({ role: values.role } as any));
    } catch (err: unknown) {
      const msg = err instanceof ApiError ? err.message : 'Erro ao cadastrar';
      setApiError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = async () => {
    try {
      const data = await apiRequest<{ auth_url: string }>('/auth/login', { method: 'GET', token: '' });
      if (data.auth_url) window.location.href = data.auth_url;
    } catch {
      setApiError('Erro ao conectar com o Google');
    }
  };

  const renderField = (
    name: string,
    label: string,
    type: string = 'text',
    opts?: { placeholder?: string; autoComplete?: string; min?: number; step?: string },
    trailing?: React.ReactNode
  ) => (
    <div className="field">
      <label htmlFor={`cad-${name}`}>{label}</label>
      <div className={trailing ? 'input-wrap' : undefined}>
        <input
          id={`cad-${name}`}
          className={`input${touched[name] && errors[name] ? ' input-error' : ''}`}
          type={type}
          name={name}
          placeholder={opts?.placeholder}
          autoComplete={opts?.autoComplete}
          value={values[name]}
          onChange={handleChange(name)}
          onBlur={handleBlur(name)}
          min={opts?.min}
          step={opts?.step}
          aria-invalid={!!(touched[name] && errors[name])}
          aria-describedby={errors[name] ? `cad-${name}-err` : undefined}
        />
        {trailing}
      </div>
      {touched[name] && errors[name] && (
        <span id={`cad-${name}-err`} className="field-error" role="alert">{errors[name]}</span>
      )}
    </div>
  );

  return (
    <AuthLayout
      title="Crie sua conta"
      subtitle="Escolha seu perfil e preencha os dados para começar."
      footer={<>Já tem conta? <Link to="/login" className="text-primary" style={{ fontWeight: 800 }}>Fazer login</Link></>}
    >
      <form className="form" onSubmit={handleSubmit} noValidate>
        {convite && (
          <div className="convite-banner" role="note">
            <div className="convite-avatar">
              {convite.foto && !conviteFotoError ? <img src={convite.foto} alt={convite.nome} onError={() => setConviteFotoError(true)} /> : <Icon name="user" size={20} />}
            </div>
            <div>
              <div className="convite-banner-title">Você foi convidado por {convite.nome}</div>
              <div className="text-muted" style={{ fontSize: '0.8rem' }}>
                {convite.tipo === 'personal_trainer' ? 'Personal Trainer' : 'Nutricionista'} · {convite.email}
              </div>
            </div>
          </div>
        )}
        <div className="grid-2">
          {renderField('nome', 'Nome', 'text', { placeholder: 'Nome', autoComplete: 'given-name' })}
          {renderField('sobrenome', 'Sobrenome', 'text', { placeholder: 'Sobrenome', autoComplete: 'family-name' })}
        </div>
        <div className="grid-2">
          {renderField('dataNascimento', 'Data de nascimento', 'date', { autoComplete: 'bday' })}
          <div className="field">
            <label htmlFor="cad-genero">Gênero</label>
            <select id="cad-genero" className="select" name="genero" value={values.genero} onChange={handleChange('genero')}>
              <option value="Masculino">Masculino</option>
              <option value="Feminino">Feminino</option>
            </select>
          </div>
        </div>
        {renderField('email', 'Email', 'email', { placeholder: 'Email', autoComplete: 'email' })}
        {renderField('senha', 'Senha (mín. 10 caracteres)', showSenha ? 'text' : 'password', { autoComplete: 'new-password' },
          <button type="button" className="password-toggle" onClick={() => setShowSenha(v => !v)} aria-label={showSenha ? 'Ocultar senha' : 'Mostrar senha'} aria-pressed={showSenha}>
            <Icon name={showSenha ? 'eyeOff' : 'eye'} size={18} />
          </button>
        )}
        <p className="field-hint">A senha precisa ter ao menos 10 caracteres, com letra maiúscula, minúscula e um número.</p>

        <div className="role-selector-container" role="radiogroup" aria-label="Tipo de perfil">
          <span style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>Você é um profissional da saúde?</span>
          <div className="role-cards-grid">
            {[
              { value: 'user', label: 'Não', sub: 'Usuário comum', icon: 'user' },
              { value: 'nutritionist', label: 'Nutricionista', sub: 'Prescrever dietas', icon: 'leaf' },
              { value: 'personal_trainer', label: 'Personal Trainer', sub: 'Prescrever treinos', icon: 'dumbbell' },
            ].map(opt => (
              <label key={opt.value} className={`role-card${values.role === opt.value ? ' role-card-selected' : ''}`}>
                <input
                  type="radio"
                  name="role"
                  value={opt.value}
                  checked={values.role === opt.value}
                  onChange={handleChange('role')}
                />
                <div className="role-card-inner">
                  <span className="role-card-icon"><Icon name={opt.icon} /></span>
                  <div className="role-card-text">
                    <strong>{opt.label}</strong>
                    <span className="text-muted" style={{ fontSize: '0.78rem' }}>{opt.sub}</span>
                  </div>
                </div>
              </label>
            ))}
          </div>
        </div>

        <div className="grid-2">
          {renderField('meta', 'Meta', 'text', { placeholder: 'Ex: Perder peso' })}
          <div className="field">
            <label htmlFor="cad-jaTreinou">Já treinou?</label>
            <select id="cad-jaTreinou" className="select" name="jaTreinou" value={values.jaTreinou} onChange={handleChange('jaTreinou')}>
              <option value="Nunca treinou">Nunca treinou</option>
              <option value="Iniciante">Iniciante</option>
              <option value="Intermediário">Intermediário</option>
              <option value="Avançado">Avançado</option>
            </select>
          </div>
        </div>
        <div className="grid-2">
          {renderField('altura', 'Altura (m)', 'number', { placeholder: '1.70', min: 0, step: '0.01' })}
          {renderField('peso', 'Peso (kg)', 'number', { placeholder: '68.5', min: 0, step: '0.1' })}
        </div>

        {apiError && <div className="alert" role="alert"><Icon name="alert" /> {apiError}</div>}
        <button className="btn btn-primary" type="submit" disabled={loading}>
          {loading ? 'Criando conta...' : <><Icon name="user" /> Criar conta grátis</>}
        </button>
        <div className="divider"><span>Ou cadastre-se com</span></div>
        <button className="btn btn-secondary" type="button" onClick={handleGoogle}><GoogleLogo /> Google</button>
      </form>
    </AuthLayout>
  );
}
