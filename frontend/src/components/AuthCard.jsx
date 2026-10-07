import { Link } from "react-router-dom";
import { LockKeyhole } from "lucide-react";
import { Logo } from "./Logo";

export function AuthCard({ eyebrow, title, description, children, footerText, footerLink, footerLabel }) {
  return (
    <section className="auth-section">
      <aside className="auth-institution">
        <Logo />
        <div><p className="eyebrow">Seu vínculo. Seus serviços.</p><h2>Uma conexão com<br />o que importa.</h2><p>Um espaço da ASJCOESP para acompanhar solicitações, acessar documentos e cuidar das rotinas do dia a dia.</p></div>
        <span className="auth-security"><LockKeyhole size={17} /> Acesso pessoal e protegido</span>
      </aside>
      <article className="auth-card">
        <p className="eyebrow">{eyebrow}</p>
        <h1>{title}</h1>
        <p className="auth-description">{description}</p>
        {children}
        {footerText && <p className="auth-footer">{footerText} <Link to={footerLink}>{footerLabel}</Link></p>}
      </article>
    </section>
  );
}
