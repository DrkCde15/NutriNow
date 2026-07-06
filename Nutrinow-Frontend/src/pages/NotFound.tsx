import { Link } from 'react-router-dom';
import Icon from '../components/Icon';

export default function NotFound() {
  return (
    <main className="page-main" style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '2rem' }}>
      <Icon name="alert" size={64} style={{ color: 'var(--muted-foreground)' }} />
      <h1 style={{ margin: '1.5rem 0 0.5rem', fontSize: '3rem' }}>404</h1>
      <p className="text-muted" style={{ marginBottom: '2rem' }}>Oops! Esta página não existe.</p>
      <Link to="/" className="btn btn-primary"><Icon name="arrowLeft" /> Voltar ao início</Link>
    </main>
  );
}
