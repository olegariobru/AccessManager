import { ArrowRight, KeyRound, LockKeyhole, ShieldCheck, UsersRound } from "lucide-react";
import { createElement } from "react";
import { Link } from "react-router-dom";

const features = [
  { icon: UsersRound, title: "Usuários centralizados", text: "Gerencie identidades, perfis e permissões em um só lugar." },
  { icon: KeyRound, title: "Acessos sob controle", text: "Defina quem pode acessar cada área com regras claras." },
  { icon: LockKeyhole, title: "Segurança por padrão", text: "Proteja sessões e credenciais com práticas modernas." },
];

export function Landing() {
  return (
    <>
      <section className="hero">
        <div className="container hero-grid">
          <div className="hero-copy">
            <p className="eyebrow"><ShieldCheck size={16} /> Gestão de acessos inteligente</p>
            <h1>Controle acessos.<br /><span>Proteja o que importa.</span></h1>
            <p className="hero-lead">Uma plataforma simples para cadastrar usuários, organizar permissões e manter sua operação segura.</p>
            <div className="hero-actions">
              <Link className="button button-primary" to="/cadastro">Criar minha conta <ArrowRight size={18} /></Link>
              <Link className="button button-secondary" to="/login">Já tenho uma conta</Link>
            </div>
            <p className="hero-note">Configuração rápida · Interface intuitiva · Segurança integrada</p>
          </div>
          <div className="hero-visual" aria-label="Painel ilustrativo do AccessManager">
            <div className="visual-glow" />
            <div className="dashboard-card">
              <div className="dashboard-top"><span /><span /><span /></div>
              <div className="dashboard-body">
                <div className="dashboard-sidebar"><b /><i /><i /><i /></div>
                <div className="dashboard-content">
                  <div className="dashboard-heading"><b /><span /></div>
                  <div className="stat-grid"><i /><i /><i /></div>
                  <div className="table-mock"><span /><span /><span /><span /></div>
                </div>
              </div>
            </div>
            <div className="security-badge"><ShieldCheck size={24} /><span><b>Ambiente protegido</b><small>Todos os sistemas operando</small></span></div>
          </div>
        </div>
      </section>

      <section className="features section" id="recursos">
        <div className="container">
          <p className="eyebrow centered">Recursos essenciais</p>
          <h2 className="section-title">Tudo o que você precisa para gerir acessos</h2>
          <div className="feature-grid">
            {features.map((feature) => (
              <article className="feature-card" key={feature.title}><span>{createElement(feature.icon, { size: 22 })}</span><h3>{feature.title}</h3><p>{feature.text}</p></article>
            ))}
          </div>
        </div>
      </section>

      <section className="security-section section" id="seguranca">
        <div className="container security-content">
          <div><p className="eyebrow">Segurança em primeiro lugar</p><h2>Projetado para dar tranquilidade</h2><p>Controles consistentes e uma experiência clara ajudam sua equipe a trabalhar com confiança.</p></div>
          <Link className="button button-primary" to="/cadastro">Começar agora <ArrowRight size={18} /></Link>
        </div>
      </section>
    </>
  );
}
