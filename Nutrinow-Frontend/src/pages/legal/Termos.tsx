import Navbar from '../../components/Navbar';
import Icon from '../../components/Icon';

export default function Termos() {
  return (
    <main className="page-main">
      <Navbar />
      <div className="container legal-page">
        <h1>Termos de Serviço</h1>
        <p className="text-muted" style={{ marginBottom: '2rem' }}>Última atualização: 2025</p>
        <section>
          <h2>1. Aceitação dos Termos</h2>
          <p>Ao acessar ou usar a plataforma NutriNow, você concorda com estes Termos de Serviço. Se não concordar, não use o serviço.</p>
        </section>
        <section>
          <h2>2. Descrição do Serviço</h2>
          <p>NutriNow é uma plataforma que oferece planos alimentares e de treino gerados por inteligência artificial, dashboard de acompanhamento e calendário de refeições e exercícios.</p>
        </section>
        <section>
          <h2>3. Conta do Usuário</h2>
          <p>Você é responsável por manter a confidencialidade de suas credenciais e por todas as atividades na sua conta.</p>
        </section>
        <section>
          <h2>4. Pagamento</h2>
          <p>O Premium é um pagamento único de R$ 29,90. O cancelamento pode ser solicitado a qualquer momento.</p>
        </section>
        <section>
          <h2>5. Limitação de Responsabilidade</h2>
          <p>As recomendações geradas pela NutriNow são baseadas em IA e não substituem acompanhamento profissional presencial.</p>
        </section>
        <section>
          <h2>6. Contato</h2>
          <p>Dúvidas sobre estes termos? Envie um e-mail para <a href="mailto:contato@nutrinow.com.br">contato@nutrinow.com.br</a>.</p>
        </section>
      </div>
      <footer className="footer"><p className="text-muted" style={{ padding: '2rem 1rem' }}>© 2025 NutriNow</p></footer>
    </main>
  );
}
