import Navbar from '../../components/Navbar';
import Footer from '../../components/Footer';

export default function Privacidade() {
  return (
    <main className="page-main">
      <Navbar />
      <div className="container legal-page">
        <h1>Política de Privacidade</h1>
        <p className="text-muted" style={{ marginBottom: '2rem' }}>Última atualização: 2025</p>
        <section>
          <h2>1. Dados Coletados</h2>
          <p>Coletamos nome, e-mail, dados antropométricos (altura, peso), preferências de treino e histórico de conversas com a IA.</p>
        </section>
        <section>
          <h2>2. Uso dos Dados</h2>
          <p>Seus dados são usados para personalizar planos alimentares e de treino, melhorar a plataforma e enviar comunicações relevantes.</p>
        </section>
        <section>
          <h2>3. Compartilhamento</h2>
          <p>Não compartilhamos seus dados pessoais com terceiros, exceto quando exigido por lei ou com seu consentimento explícito.</p>
        </section>
        <section>
          <h2>4. Cookies</h2>
          <p>Utilizamos cookies essenciais para o funcionamento da plataforma. Você pode configurar seu navegador para recusá-los.</p>
        </section>
        <section>
          <h2>5. Direitos do Titular</h2>
          <p>Você pode solicitar acesso, correção ou exclusão dos seus dados a qualquer momento através do e-mail <a href="mailto:contato@nutrinow.com.br">contato@nutrinow.com.br</a>.</p>
        </section>
      </div>
      <Footer />
    </main>
  );
}
