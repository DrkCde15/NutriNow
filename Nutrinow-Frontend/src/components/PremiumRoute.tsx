import { type ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import PremiumModal from './PremiumModal';

interface Props {
  children: ReactNode;
  requireProfessional?: boolean;
}

export default function PremiumRoute({ children, requireProfessional }: Props) {
  const { user, isPremium, isProfessional } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (requireProfessional && !isProfessional) return <Navigate to="/" replace />;
  if (!isPremium) return <PremiumModal />;
  return <>{children}</>;
}
