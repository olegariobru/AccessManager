import { Link, useLocation } from "react-router-dom";
import { ArrowUpRight } from "lucide-react";
import { Logo } from "./Logo";

export function Header() {
  const { pathname } = useLocation();

  return (
    <header className="site-header">
      <div className="container header-inner">
        <Logo />
        <span className="header-caption">Portal de serviços · ASJCOESP</span>
        {pathname !== "/login" && (
          <Link className="button button-primary button-small" to="/login">Acessar portal <ArrowUpRight size={16} /></Link>
        )}
      </div>
    </header>
  );
}
