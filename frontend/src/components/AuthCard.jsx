import { Link } from "react-router-dom";

export function AuthCard({ eyebrow, title, description, children, footerText, footerLink, footerLabel }) {
  return (
    <section className="auth-section">
      <div className="auth-decoration auth-decoration-one" />
      <div className="auth-decoration auth-decoration-two" />
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
