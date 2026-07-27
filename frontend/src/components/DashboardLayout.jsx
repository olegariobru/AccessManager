import { LayoutDashboard, LogOut } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { clearSession, getSession } from "../utils/auth";
import { Logo } from "./Logo";

export function DashboardLayout({ title, description, children }) {
  const navigate = useNavigate();
  const session = getSession();

  function handleLogout() {
    clearSession();
    navigate("/login", { replace: true });
  }

  return (
    <div className="dashboard-page">
      <header className="dashboard-header">
        <Logo />
        <div className="dashboard-user">
          <div>
            <strong>{session?.user.name}</strong>
            <span>{session?.user.role}</span>
          </div>
          <button className="button button-secondary button-small" type="button" onClick={handleLogout}>
            <LogOut size={17} />
            Sair
          </button>
        </div>
      </header>
      <main className="dashboard-main container">
        <div className="dashboard-title">
          <span><LayoutDashboard size={20} /> Visão geral</span>
          <h1>{title}</h1>
          <p>{description}</p>
        </div>
        {children}
      </main>
    </div>
  );
}
