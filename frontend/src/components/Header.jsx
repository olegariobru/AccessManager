import { Link, NavLink } from "react-router-dom";
import { Logo } from "./Logo";

export function Header() {
  return (
    <header className="site-header">
      <div className="container header-inner">
        <Logo />
        <div className="header-actions">
          <Link className="button button-ghost" to="/login">Entrar</Link>
          {/* <Link className="button button-primary button-small" to="/cadastro">Começar agora</Link> */}
        </div>
      </div>
    </header>
  );
}
