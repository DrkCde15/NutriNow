import { getApiBase } from '../api/client';

export function pexelsImage(q: string, w = 800, h = 600, orientation = 'landscape'): string {
  const API = getApiBase();
  return `${API}/pexels-image?q=${encodeURIComponent(q)}&w=${w}&h=${h}&orientation=${orientation}`;
}

export function pexelsFallback(q: string, w: number, h: number): string {
  return `https://picsum.photos/seed/${encodeURIComponent(q)}/${w}/${h}`;
}

export function handlePexelsError(e: React.SyntheticEvent<HTMLImageElement>, q: string, w: number, h: number) {
  const img = e.currentTarget;
  img.onerror = null;
  img.src = pexelsFallback(q, w, h);
}
