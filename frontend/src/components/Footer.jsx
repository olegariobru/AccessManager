import { Logo } from "./Logo";

export function Footer() {
  return (
    <footer className="site-footer">
      <div className="container footer-inner">
        <Logo />
        <p>© {new Date().getFullYear()} AccessManager. Acesso simples, controle seguro.</p>
      </div>
    </footer>
  );
}
