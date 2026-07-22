import { Logo } from "./Logo";

export function Footer() {
  return (
    <footer className="site-footer">
      <div className="container footer-inner">
        <Logo />
        <p>© {new Date().getFullYear()} ASJCOESP, DESENVOLVIDO POR BRUNO OLEGÁRIO.</p>
      </div>
    </footer>
  );
}
