import Navbar from '../../components/Navbar';
import Footer from '../../components/Footer';

export default function Lgpd() {
  return (
    <main className="page-main">
      <Navbar />
      <div className="container legal-page">
        <h1>LGPD – Lei Geral de Proteção de Dados</h1>
        <p className="text-muted" style={{ marginBottom: '2rem' }}>Conformidade com a Lei nº 13.709/2018</p>
        <section>
          <h2>Encarregado (DPO)</h2>
          <p>Nosso encarregado de dados pode ser contatado em <a href="mailto:contato@nutrinow.com.br">contato@nutrinow.com.br</a>.</p>
        </section>
        <section>
          <h2>Base legal para tratamento</h2>
          <p>Tratamos seus dados com base no consentimento (art. 7º, I da LGPD) e na execução do contrato de prestação de serviços (art. 7º, V).</p>
        </section>
        <section>
          <h2>Seus direitos (art. 18 LGPD)</h2>
          <ul>
            <li>Confirmar a existência de tratamento</li>
            <li>Acessar seus dados</li>
            <li>Corrigir dados incompletos ou desatualizados</li>
            <li>Solicitar anonimização ou eliminação</li>
            <li>Revogar o consentimento a qualquer momento</li>
            <li>Solicitar portabilidade dos dados</li>
          </ul>
        </section>
        <section>
          <h2>Segurança</h2>
          <p>Adotamos medidas técnicas e administrativas para proteger seus dados contra acessos não autorizados, incluindo criptografia TLS e armazenamento seguro.</p>
        </section>
        <section>
          <h2>Retenção</h2>
          <p>Seus dados são mantidos enquanto sua conta estiver ativa. Após exclusão da conta, os dados são removidos em até 90 dias.</p>
        </section>
      </div>
      <Footer />
    </main>
  );
}
