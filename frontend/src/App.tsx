import { Routes, Route } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import Landing from './pages/Landing';
import Login from './pages/auth/Login';
import Cadastro from './pages/auth/Cadastro';
import EsqueciSenha from './pages/auth/EsqueciSenha';
import ResetSenha from './pages/auth/ResetSenha';
import PagamentoAprovado from './pages/PagamentoAprovado';
import Dashboard from './pages/Dashboard';
import Planos from './pages/Planos';
import Calendario from './pages/Calendario';
import Chat from './pages/Chat';
import Rotina from './pages/Rotina';
import Academias from './pages/Academias';
import Perfil from './pages/Perfil';
import Feedbacks from './pages/Feedbacks';
import Termos from './pages/legal/Termos';
import Privacidade from './pages/legal/Privacidade';
import Lgpd from './pages/legal/Lgpd';
import Pacientes from './pages/professional/Pacientes';
import PacienteDetalhe from './pages/professional/PacienteDetalhe';
import Anotacoes from './pages/professional/Anotacoes';
import Convidar from './pages/professional/Convidar';
import NotFound from './pages/NotFound';
import PremiumRoute from './components/PremiumRoute';
import ScrollToTop from './components/ScrollToTop';

export default function App() {
  const { loading } = useAuth();
  if (loading) return <div className="loading-screen"><div className="spinner" /></div>;
  return (
    <>
      <ScrollToTop />
      <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/login" element={<Login />} />
      <Route path="/cadastro" element={<Cadastro />} />
      <Route path="/esqueci-senha" element={<EsqueciSenha />} />
      <Route path="/reset-senha" element={<ResetSenha />} />
      <Route path="/pagamento-aprovado" element={<PagamentoAprovado />} />
      <Route path="/pagamento-sucesso" element={<PagamentoAprovado />} />
      <Route path="/dashboard" element={<PremiumRoute><Dashboard /></PremiumRoute>} />
      <Route path="/planos" element={<Planos />} />
      <Route path="/calendario" element={<PremiumRoute><Calendario /></PremiumRoute>} />
      <Route path="/dieta-treino" element={<PremiumRoute><Rotina /></PremiumRoute>} />
      <Route path="/dieta" element={<PremiumRoute><Rotina /></PremiumRoute>} />
      <Route path="/treino" element={<PremiumRoute><Rotina /></PremiumRoute>} />
      <Route path="/academias" element={<Academias />} />
      <Route path="/chat" element={<Chat />} />
      <Route path="/perfil" element={<Perfil />} />
      <Route path="/feedbacks" element={<Feedbacks />} />
      <Route path="/termos" element={<Termos />} />
      <Route path="/privacidade" element={<Privacidade />} />
      <Route path="/lgpd" element={<Lgpd />} />
      <Route path="/pacientes" element={<Pacientes />} />
      <Route path="/pacientes/:id" element={<PacienteDetalhe />} />
      <Route path="/pacientes/:id/anotacoes" element={<Anotacoes />} />
      <Route path="/convidar" element={<Convidar />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
    </>
  );
}
