import { ArrowRight, CalendarDays, FileText, LockKeyhole, UsersRound } from "lucide-react";
import { Link } from "react-router-dom";

const services = [
  { number: "01", icon: CalendarDays, title: "Rotinas de trabalho", text: "Solicite férias e acompanhe cada etapa, da análise do coordenador à decisão do RH." },
  { number: "02", icon: FileText, title: "Documentos à mão", text: "Consulte os holerites, arquivos de IRPF e boletos publicados para a sua conta." },
  { number: "03", icon: UsersRound, title: "Gestão conectada", text: "Equipes, RH e administração reunidos em um ambiente com acesso por perfil." },
];

export function Landing() {
  return (
    <>
      <section className="hero">
        <div className="container hero-grid">
          <div className="hero-copy">
            <p className="eyebrow">ASJCOESP · Portal de serviços</p>
            <h1>Mais próximo.<br />Mais simples.<br /><em>Todos os dias.</em></h1>
            <p className="hero-lead">O SERVNET conecta pessoas e serviços da associação. Suas solicitações, documentos e rotinas em um só lugar.</p>
            <Link className="button button-primary" to="/login">Entrar no SERVNET <ArrowRight size={18} /></Link>
            <p className="hero-note"><LockKeyhole size={14} /> Acesso exclusivo com sua conta pessoal</p>
          </div>
          <aside className="institution-panel" aria-label="SERVNET, um espaço da ASJCOESP">
            <div className="institution-monogram" aria-hidden="true">S<span>N</span></div>
            <div className="institution-panel-caption"><span>Conexão a serviço das pessoas</span><strong>SERVNET</strong><p>Um espaço da ASJCOESP.<br />Feito para o seu dia a dia.</p></div>
            <span className="institution-panel-index" aria-hidden="true">ASSOCIAÇÃO / SERVIÇOS / PESSOAS</span>
          </aside>
        </div>
      </section>
      <section className="services-section">
        <div className="container">
          <div className="services-heading"><p className="eyebrow">O que você encontra aqui</p><h2>Serviços que acompanham você.</h2></div>
          <div className="service-grid">
            {services.map(({ number, icon, title, text }) => {
              const Icon = icon;
              return (
                <article className="service-item" key={number}>
                  <div className="service-item-top"><Icon size={25} strokeWidth={1.5} /><span>{number}</span></div>
                  <h3>{title}</h3>
                  <p>{text}</p>
                </article>
              );
            })}
          </div>
          <div className="landing-help"><span>Já tem uma conta? Acesse com seu e-mail e senha.</span><Link to="/esqueci-minha-senha">Preciso recuperar meu acesso <ArrowRight size={16} /></Link></div>
        </div>
      </section>
    </>
  );
}
