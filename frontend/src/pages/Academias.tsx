import { useState } from 'react';
import { apiRequest } from '../api/client';
import Navbar from '../components/Navbar';
import Icon from '../components/Icon';

interface Academia {
  id: string;
  nome: string;
  endereco: string;
  telefone: string;
  website: string | null;
  horarios: string;
  lat: number;
  lng: number;
  distancia_km: number;
}

interface AcademiasResponse {
  success: boolean;
  count: number;
  academias: Academia[];
}

const RADIUS_OPTIONS = [5, 10, 20, 50];

function formatDistance(km: number): string {
  if (km < 1) return `${Math.max(1, Math.round(km * 1000))} m`;
  return `${km.toFixed(1).replace('.', ',')} km`;
}

export default function Academias() {
  const [radius, setRadius] = useState(10);
  const [loading, setLoading] = useState(false);
  const [locating, setLocating] = useState(false);
  const [error, setError] = useState('');
  const [academias, setAcademias] = useState<Academia[]>([]);
  const [currentLocation, setCurrentLocation] = useState<{ lat: number; lng: number } | null>(null);

  const fetchNearby = async (lat: number, lng: number) => {
    setLoading(true);
    setError('');
    try {
      const data = await apiRequest<AcademiasResponse>(
        `/academias/nearby?lat=${lat}&lng=${lng}&radius=${radius}`
      );
      setAcademias(data.academias || []);
      setCurrentLocation({ lat, lng });
    } catch {
      setError('Não foi possível buscar academias próximas agora. Tente novamente em instantes.');
    } finally {
      setLoading(false);
    }
  };

  const useLocation = () => {
    if (!navigator.geolocation) {
      setError('Seu navegador não suporta geolocalização.');
      return;
    }
    setLocating(true);
    setError('');
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        setLocating(false);
        await fetchNearby(position.coords.latitude, position.coords.longitude);
      },
      (err) => {
        setLocating(false);
        if (err.code === err.PERMISSION_DENIED) {
          setError('Permissão de localização negada. Tente novamente ou use outra região.');
        } else {
          setError('Não foi possível obter sua localização. Tente novamente.');
        }
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 60000 }
    );
  };

  const mapsLink = (academia: Academia) =>
    `https://www.google.com/maps/search/?api=1&query=${academia.lat},${academia.lng}`;

  return (
    <main className="page-main">
      <Navbar />
      <div className="container" style={{ padding: '2rem 1.5rem', maxWidth: '66rem' }}>
        <div style={{ marginBottom: '1.5rem' }}>
          <h1>Academias próximas</h1>
          <p className="text-muted">Encontre academias na sua região para não perder a rotina de treinos.</p>
        </div>

        <div className="card" style={{ marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-end', gap: '1rem' }}>
            <div className="field" style={{ flex: '0 0 12rem' }}>
              <label htmlFor="radius">Raio de busca (km)</label>
              <select id="radius" className="select" value={radius} onChange={(e) => setRadius(Number(e.target.value))}>
                {RADIUS_OPTIONS.map((option) => (
                  <option key={option} value={option}>{option} km</option>
                ))}
              </select>
            </div>
            <button className="btn btn-primary" onClick={useLocation} disabled={loading || locating}>
              <Icon name="mapPin" />
              {locating ? 'Obtendo localização...' : 'Usar minha localização'}
            </button>
          </div>
        </div>

        {error && <div className="alert" style={{ marginBottom: '1.5rem' }}><Icon name="alertCircle" /> {error}</div>}

        {loading && <div style={{ textAlign: 'center', padding: '2rem' }}><div className="spinner" /></div>}

        {!loading && currentLocation && academias.length === 0 && (
          <div className="card" style={{ textAlign: 'center', padding: '2rem' }}>
            <Icon name="dumbbell" size={48} style={{ color: 'var(--muted-foreground)' }} />
            <h3 style={{ margin: '1rem 0 0.5rem' }}>Nenhuma academia encontrada</h3>
            <p className="text-muted">Aumente o raio de busca ou tente outra região.</p>
          </div>
        )}

        {!loading && !currentLocation && academias.length === 0 && (
          <div className="card" style={{ textAlign: 'center', padding: '2rem' }}>
            <Icon name="mapPin" size={48} style={{ color: 'var(--muted-foreground)' }} />
            <h3 style={{ margin: '1rem 0 0.5rem' }}>Encontre academias perto de você</h3>
            <p className="text-muted">Permita o acesso à localização para listar academias próximas.</p>
          </div>
        )}

        {!loading && academias.length > 0 && (
          <div style={{ marginBottom: '0.75rem' }}>
            <span className="badge">{academias.length} academias em até {radius} km</span>
          </div>
        )}

        <div style={{ display: 'grid', gap: '1rem' }}>
          {academias.map((item) => (
            <div key={item.id} className="card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem', flexWrap: 'wrap' }}>
                <div style={{ flex: 1, minWidth: '12rem' }}>
                  <h3 style={{ marginBottom: '0.35rem' }}>{item.nome}</h3>
                  {item.endereco && <p className="text-muted" style={{ fontSize: '0.9rem' }}>{item.endereco}</p>}
                  <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginTop: '0.5rem' }}>
                    <span className="badge"><Icon name="mapPin" size={14} /> {formatDistance(item.distancia_km)}</span>
                    {item.horarios && <span className="badge"><Icon name="clock" size={14} /> {item.horarios}</span>}
                  </div>
                </div>
                <a href={mapsLink(item)} target="_blank" rel="noopener noreferrer" className="btn btn-secondary" style={{ padding: '0.55rem 1rem', fontSize: '0.85rem' }}>
                  <Icon name="arrowRight" /> Rota
                </a>
              </div>
              <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginTop: '0.75rem', fontSize: '0.85rem' }}>
                {item.telefone && (
                  <a href={`tel:${item.telefone}`} className="text-muted" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
                    <Icon name="contact" size={14} /> {item.telefone}
                  </a>
                )}
                {item.website && (
                  <a href={item.website} target="_blank" rel="noopener noreferrer" className="text-muted" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
                    <Icon name="web" size={14} /> Site
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}