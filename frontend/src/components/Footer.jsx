import { Logo } from "./Logo";

export function Footer() {
  return (
    <footer className="site-footer">
      <div className="container footer-inner">
        <Logo />
        <p>© {new Date().getFullYear()} ASJCOESP · Portal SERVNET<br /><span>Desenvolvido por Bruno Olegário</span></p>
      </div>
    </footer>
  );
}
