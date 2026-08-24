import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { apiRequest, ApiError } from '../api/client';
import { useForm, validators } from '../hooks/useForm';
import Icon from '../components/Icon';
import Navbar from '../components/Navbar';

const ROLE_LABELS: Record<string, string> = {
  user: 'Usuário comum',
  nutritionist: 'Nutricionista',
  personal_trainer: 'Personal Trainer',
};

export default function Perfil() {
  const { user, updateUser, logout } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);
  const [apiError, setApiError] = useState('');
  const [profileLoaded, setProfileLoaded] = useState(false);
  const [avatarError, setAvatarError] = useState(false);
  const [convidadoFotoError, setConvidadoFotoError] = useState(false);

  const { values, errors, touched, handleChange, handleBlur, validateAll, setValue } = useForm({
    nome: { initial: user?.nome || '', rules: [validators.required('Informe o nome')] },
    sobrenome: { initial: user?.sobrenome || '' },
    genero: { initial: user?.genero || 'Masculino' },
    dataNascimento: { initial: user?.dataNascimento || '' },
    email: { initial: user?.email || '', rules: [validators.required('Informe o email'), validators.email()] },
    meta: { initial: user?.meta || 'Não definida' },
    jaTreinou: { initial: (user as any)?.ja_treinou || 'Nunca treinou' },
    altura: { initial: String(user?.altura ?? '') },
    peso: { initial: String(user?.peso ?? '') },
  });

  useEffect(() => {
    if (!user) { navigate('/login', { replace: true }); return; }
    loadProfile();
  }, []);

  // Sincroniza o formulário com os dados completos vindos de /perfil
  // (o payload de login não traz genero, dataNascimento, meta, ja_treinou).
  useEffect(() => {
    if (!profileLoaded || !user) return;
    const p = user as any;
    setValue('nome', user.nome || '');
    setValue('sobrenome', user.sobrenome || '');
    setValue('genero', p.genero || 'Masculino');
    setValue('dataNascimento', p.dataNascimento || '');
    setValue('email', user.email || '');
    setValue('meta', p.meta || 'Não definida');
    setValue('jaTreinou', p.ja_treinou || 'Nunca treinou');
    setValue('altura', String(user.altura ?? ''));
    setValue('peso', String(user.peso ?? ''));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profileLoaded]);

  const loadProfile = async () => {
    try {
      const data = await apiRequest<Record<string, unknown>>('/perfil');
      if (data) updateUser(data);
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        logout();
        navigate('/login', { replace: true });
        return;
      }
    }
    setProfileLoaded(true);
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!validateAll()) return;
    setApiError('');
    setLoading(true);
    try {
      const altura = values.altura ? Number(values.altura) : undefined;
      const peso = values.peso ? Number(values.peso) : undefined;
      const payload = {
        nome: values.nome.trim(),
        sobrenome: values.sobrenome.trim(),
        genero: values.genero,
        dataNascimento: values.dataNascimento,
        email: values.email.trim(),
        meta: values.meta.trim() || 'Não definida',
        altura: altura && !isNaN(altura) ? altura : undefined,
        peso: peso && !isNaN(peso) ? peso : undefined,
        ja_treinou: values.jaTreinou || 'Nunca treinou',
      };
      await apiRequest('/perfil', { method: 'POST', body: payload });
      updateUser(payload);
      setSaved(true);
      setTimeout(() => setSaved(false), 1800);
    } catch (err: unknown) {
      setApiError(err instanceof ApiError ? err.message : 'Erro ao salvar');
    } finally {
      setLoading(false);
    }
  };

  const handleAvatar = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => updateUser({ avatar: reader.result as string });
    reader.readAsDataURL(file);
  };

  const handleRemoveAvatar = () => updateUser({ avatar: '' });

  if (!user) return null;

  const fullName = `${user.nome || ''} ${user.sobrenome || ''}`.trim() || 'Usuário NutriNow';
  const initials = fullName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
  const convidadoPor = (user as any)?.convidadoPor as
    | { id: number; nome: string; email: string; tipo: string; foto: string | null }
    | null
    | undefined;

  const renderField = (
    name: string,
    label: string,
    type: string = 'text',
    opts?: { placeholder?: string; autoComplete?: string; min?: number; step?: string }
  ) => (
    <div className="field">
      <label htmlFor={`perfil-${name}`}>{label}</label>
      <input
        id={`perfil-${name}`}
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
        aria-describedby={errors[name] ? `perfil-${name}-err` : undefined}
      />
      {touched[name] && errors[name] && (
        <span id={`perfil-${name}-err`} className="field-error" role="alert">{errors[name]}</span>
      )}
    </div>
  );

  return (
    <main className="page-main">
      <Navbar />

      <div className="container" style={{ padding: '2rem 1.5rem', maxWidth: '66rem' }}>
        <section className="profile-hero">
          <div className="profile-hero-inner">
            <div className="avatar-wrap">
              <div className="avatar">
                {user.avatar && !avatarError ? <img src={user.avatar} alt={fullName} onError={() => setAvatarError(true)} /> : <span>{initials}</span>}
              </div>
              <button className="icon-btn avatar-button" onClick={() => document.getElementById('avatar-input')?.click()} aria-label="Alterar foto de perfil"><Icon name="camera" /></button>
              <input id="avatar-input" type="file" accept="image/*" className="hidden" onChange={handleAvatar} />
            </div>
            <div style={{ flex: 1 }}>
              <span className="badge" style={{ background: 'rgba(255,255,255,.16)', borderColor: 'rgba(255,255,255,.25)', color: 'var(--primary-foreground)' }}>
                <Icon name="sparkles" /> {ROLE_LABELS[user.role || 'user']}
              </span>
              <h1 style={{ marginTop: '.8rem', fontSize: 'clamp(2rem,5vw,3rem)' }}>{fullName}</h1>
              <p style={{ marginTop: '.25rem', color: 'rgba(255,255,255,.8)' }}>{user.email}</p>
            </div>
          </div>
        </section>

        {convidadoPor && (
          <section className="card" style={{ marginBottom: '1.5rem' }}>
            <div className="convite-banner" role="note">
              <div className="convite-avatar">
                {convidadoPor.foto && !convidadoFotoError ? <img src={convidadoPor.foto} alt={convidadoPor.nome} onError={() => setConvidadoFotoError(true)} /> : <Icon name="user" size={20} />}
              </div>
              <div>
                <div className="convite-banner-title">
                  Você foi convidado por {convidadoPor.nome}
                </div>
                <div className="text-muted" style={{ fontSize: '0.8rem' }}>
                  {convidadoPor.tipo === 'personal_trainer' ? 'Personal Trainer' : 'Nutricionista'} · {convidadoPor.email}
                </div>
              </div>
            </div>
          </section>
        )}

        <section className="card">
          <div className="form-head" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <div>
              <h2 style={{ margin: 0 }}>Informações da conta</h2>
              <p className="text-muted" style={{ marginTop: '.35rem' }}>Atualize os mesmos dados usados na experiência do app.</p>
            </div>
            {saved && <span className="status-pill status-positive"><Icon name="check" /> Salvo</span>}
          </div>

          {apiError && <div className="alert" role="alert" style={{ marginBottom: '1rem' }}><Icon name="alert" /> {apiError}</div>}

          <form className="form" onSubmit={handleSubmit} noValidate>
            <div className="grid-2">
              {renderField('nome', 'Nome', 'text', { autoComplete: 'given-name' })}
              {renderField('sobrenome', 'Sobrenome', 'text', { autoComplete: 'family-name' })}
            </div>
            <div className="grid-2">
              <div className="field">
                <label htmlFor="perfil-genero">Gênero</label>
                <select id="perfil-genero" className="select" name="genero" value={values.genero} onChange={handleChange('genero')}>
                  <option value="Masculino">Masculino</option>
                  <option value="Feminino">Feminino</option>
                </select>
              </div>
              {renderField('dataNascimento', 'Data de nascimento', 'date', { autoComplete: 'bday' })}
            </div>
            {renderField('email', 'Email', 'email', { autoComplete: 'email' })}
            <div className="grid-2">
              {renderField('meta', 'Meta')}
              <div className="field">
                <label htmlFor="perfil-jaTreinou">Já treinou?</label>
                <select id="perfil-jaTreinou" className="select" name="jaTreinou" value={values.jaTreinou} onChange={handleChange('jaTreinou')}>
                  <option value="Nunca treinou">Nunca treinou</option>
                  <option value="Iniciante">Iniciante</option>
                  <option value="Intermediário">Intermediário</option>
                  <option value="Avançado">Avançado</option>
                </select>
              </div>
            </div>
            <div className="grid-2">
              {renderField('altura', 'Altura (m)', 'number', { min: 0, step: '0.01' })}
              {renderField('peso', 'Peso (kg)', 'number', { min: 0, step: '0.1' })}
            </div>

            {user.avatar && (
              <button className="btn btn-ghost text-danger" type="button" onClick={handleRemoveAvatar} style={{ justifyContent: 'flex-start', paddingLeft: 0 }}>
                <Icon name="trash" /> Remover avatar
              </button>
            )}

            <div className="modal-actions" style={{ borderTop: '1px solid var(--border)', paddingTop: '1.25rem' }}>
              <button className="btn btn-secondary" type="button" onClick={logout}><Icon name="logout" /> Sair da conta</button>
              <button className="btn btn-primary" type="submit" disabled={loading}>
                {loading ? 'Salvando...' : <><Icon name="save" /> Salvar alterações</>}
              </button>
            </div>
          </form>
        </section>
      </div>
    </main>
  );
}
