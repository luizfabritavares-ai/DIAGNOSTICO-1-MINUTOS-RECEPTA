import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Política de Privacidade | Recepta Plus',
  description:
    'Como a Recepta Soluções Digitais coleta, usa e protege seus dados no diagnóstico digital gratuito.',
  robots: { index: true, follow: true },
};

const S = {
  h2: { fontSize: 20, fontWeight: 800 as const, color: '#1A1A1A', margin: '34px 0 10px' },
  p: { fontSize: 15.5, lineHeight: 1.75, color: '#3D3A34', margin: '0 0 14px' },
  li: { fontSize: 15.5, lineHeight: 1.75, color: '#3D3A34', margin: '0 0 8px' },
};

export default function PoliticaDePrivacidade() {
  return (
    <div style={{ fontFamily: 'Montserrat, sans-serif', background: '#FBF7F0', minHeight: '100vh' }}>
      <div style={{ maxWidth: 760, margin: '0 auto', padding: '48px 20px 80px' }}>
        <Link href="/" style={{ color: '#D4432C', fontWeight: 700, fontSize: 14, textDecoration: 'none' }}>
          ← Voltar para o diagnóstico
        </Link>

        <h1 style={{ fontSize: 32, fontWeight: 900, color: '#1A1A1A', letterSpacing: '-0.8px', margin: '18px 0 6px' }}>
          Política de Privacidade
        </h1>
        <p style={{ ...S.p, color: '#6B6B6B', fontSize: 13.5 }}>
          RECEPTA SOLUÇÕES DIGITAIS LTDA · CNPJ 66.666.086/0001-02 · Última atualização: 3 de julho de 2026
        </p>

        <p style={S.p}>
          Esta página explica, em linguagem simples, como tratamos os seus dados quando você usa o
          diagnóstico digital gratuito da Recepta Plus, em conformidade com a Lei Geral de Proteção de
          Dados (Lei nº 13.709/2018 — LGPD).
        </p>

        <h2 style={S.h2}>1. Quais dados coletamos</h2>
        <ul style={{ paddingLeft: 22, margin: 0 }}>
          <li style={S.li}>
            <strong>Dados que você informa no formulário:</strong> nome, WhatsApp, nome da farmácia,
            cidade, estado, @ do Instagram, endereço da farmácia e e-mail (opcional).
          </li>
          <li style={S.li}>
            <strong>Dados públicos do seu negócio:</strong> para gerar o diagnóstico, consultamos
            informações públicas como o perfil da farmácia no Google (avaliações, nota), o perfil
            público no Instagram e estabelecimentos concorrentes na região.
          </li>
          <li style={S.li}>
            <strong>Dados de navegação:</strong> parâmetros de campanha (UTMs), identificadores de
            clique de anúncios (fbclid/gclid) e eventos de uso da página via cookies e tecnologias
            como o Meta Pixel e o Google Analytics.
          </li>
        </ul>

        <h2 style={S.h2}>2. Para que usamos</h2>
        <ul style={{ paddingLeft: 22, margin: 0 }}>
          <li style={S.li}>Gerar e exibir o seu diagnóstico digital gratuito;</li>
          <li style={S.li}>Enviar o diagnóstico em PDF no WhatsApp informado;</li>
          <li style={S.li}>Entrar em contato para apresentar os serviços da Recepta Plus, caso haja interesse;</li>
          <li style={S.li}>Medir a eficácia dos nossos anúncios e melhorar a experiência da página.</li>
        </ul>

        <h2 style={S.h2}>3. Base legal</h2>
        <p style={S.p}>
          Tratamos seus dados com base no seu <strong>consentimento</strong> (art. 7º, I, da LGPD),
          dado ao marcar a caixa de concordância antes de enviar o formulário, e no{' '}
          <strong>legítimo interesse</strong> (art. 7º, IX) para análises de dados públicos do seu
          negócio e métricas de anúncios. Você pode revogar o consentimento a qualquer momento.
        </p>

        <h2 style={S.h2}>4. Com quem compartilhamos</h2>
        <p style={S.p}>
          Não vendemos seus dados. Compartilhamos apenas com fornecedores necessários à operação:
          provedores de infraestrutura em nuvem (hospedagem da página e do banco de dados),
          Meta/WhatsApp (envio da mensagem com o PDF e mensuração de anúncios), Google (analytics) e
          nossa ferramenta interna de gestão de atendimento. Todos operam sob contratos e políticas
          próprias de proteção de dados.
        </p>

        <h2 style={S.h2}>5. Por quanto tempo guardamos</h2>
        <p style={S.p}>
          Mantemos seus dados enquanto durar o relacionamento comercial ou até você pedir a exclusão.
          Dados de mensuração de anúncios seguem os prazos das plataformas (Meta e Google).
        </p>

        <h2 style={S.h2}>6. Seus direitos</h2>
        <p style={S.p}>
          Você pode, a qualquer momento, solicitar: confirmação do tratamento, acesso aos dados,
          correção, anonimização, portabilidade, exclusão e informação sobre compartilhamentos, além
          de revogar o consentimento. Basta enviar um e-mail para o contato abaixo.
        </p>

        <h2 style={S.h2}>7. Segurança</h2>
        <p style={S.p}>
          Adotamos medidas técnicas e organizacionais para proteger seus dados: comunicação
          criptografada (HTTPS), acesso restrito por credenciais e armazenamento em provedores com
          certificações de segurança de mercado.
        </p>

        <h2 style={S.h2}>8. Cookies</h2>
        <p style={S.p}>
          Usamos cookies estritamente para mensuração de campanhas (Meta Pixel e Google Analytics).
          Você pode bloqueá-los nas configurações do seu navegador sem perder acesso ao diagnóstico.
        </p>

        <h2 style={S.h2}>9. Contato do encarregado (DPO)</h2>
        <p style={S.p}>
          Dúvidas ou solicitações sobre seus dados: <strong>daniel_aulicino@receptaplus.com.br</strong>
        </p>

        <p style={{ ...S.p, marginTop: 30, fontSize: 13.5, color: '#6B6B6B' }}>
          Esta política pode ser atualizada periodicamente. A versão vigente estará sempre nesta página.
        </p>
      </div>
    </div>
  );
}
