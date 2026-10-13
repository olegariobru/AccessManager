import { ArrowRight, CalendarCheck, FileText, LockKeyhole, ShieldCheck } from "lucide-react";
import { Link } from "react-router-dom";

export function Landing() {
  return (
    <>
      <section className="hero">
        <div className="container hero-grid">
          <div className="hero-copy">
            <p className="eyebrow">Portal de serviços da ASJCOESP</p>
            <h1>Seus serviços,<br /><em>em um só lugar.</em></h1>
            <p className="hero-lead">Consulte documentos, acompanhe solicitações e acesse suas informações de trabalho com uma conta pessoal e protegida.</p>
            <Link className="button button-primary hero-cta" to="/login">
              Acessar meus serviços <ArrowRight size={18} />
            </Link>
            <p className="hero-note"><LockKeyhole size={14} /> Conta fornecida pela administração. Acesso exclusivo e protegido.</p>
          </div>
          <aside className="institution-panel" aria-label="SERVNET, um espaço da ASJCOESP">
            <div className="institution-monogram" aria-hidden="true">S<span>N</span></div>
            <div className="institution-panel-caption"><span>Conexão a serviço das pessoas</span><strong>SERVNET</strong><p>Um espaço da ASJCOESP.<br /></p></div>
          </aside>
        </div>
      </section>

      <section className="service-proof" aria-labelledby="service-proof-title">
        <div className="container">
          <div className="service-proof-heading">
            <p className="eyebrow">O que você encontra no portal</p>
            <h2 id="service-proof-title">Resolva suas rotinas sem depender de planilhas ou mensagens.</h2>
          </div>
          <div className="service-proof-grid">
            <article>
              <span><FileText size={21} /></span>
              <h3>Documentos disponíveis</h3>
              <p>Acesse holerites, informes de IRPF e outros arquivos liberados para a sua conta.</p>
            </article>
            <article>
              <span><CalendarCheck size={21} /></span>
              <h3>Solicitações acompanhadas</h3>
              <p>Envie pedidos de férias e consulte cada etapa da aprovação em um único fluxo.</p>
            </article>
            <article>
              <span><ShieldCheck size={21} /></span>
              <h3>Acesso com privacidade</h3>
              <p>Visualize apenas as informações e os documentos vinculados ao seu perfil.</p>
            </article>
          </div>
          <div className="service-proof-action">
            <div><strong>Já tem uma conta?</strong><span>Entre com o e-mail e a senha fornecidos pela administração.</span></div>
            <Link className="button button-secondary" to="/login">Ir para o acesso <ArrowRight size={17} /></Link>
          </div>
        </div>
      </section>
    </>
  );
}
