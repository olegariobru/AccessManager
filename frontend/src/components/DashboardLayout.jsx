import { CalendarDays, LayoutDashboard, LogOut, ShieldCheck, UserRound, UsersRound } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { clearSession, getSession } from "../utils/auth";
import { Logo } from "./Logo";

export function DashboardLayout({ title, description, children }) {
  const navigate = useNavigate();
  const location = useLocation();
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
          <button className="button button-primary button-secondary button-small" type="button" onClick={handleLogout}>
            <LogOut size={17} />
            Sair
          </button>
        </div>
      </header>
      <main className="dashboard-main container">
        <nav className="dashboard-switcher" aria-label="Áreas disponíveis">
          {session?.user.role === "ADMIN" && <>
            <ViewButton active={location.pathname === "/admin"} icon={<ShieldCheck size={16} />} onClick={() => navigate("/admin")}>Administração</ViewButton>
            <ViewButton active={location.pathname === "/usuario"} icon={<UserRound size={16} />} onClick={() => navigate("/usuario")}>Funcionário</ViewButton>
            <ViewButton active={location.pathname === "/coordenador"} icon={<UsersRound size={16} />} onClick={() => navigate("/coordenador")}>Coordenador</ViewButton>
            <ViewButton active={location.pathname === "/rh"} icon={<CalendarDays size={16} />} onClick={() => navigate("/rh")}>RH</ViewButton>
          </>}
          {session?.user.role === "COORDINATOR" && <>
            <ViewButton active={location.pathname === "/coordenador"} icon={<UsersRound size={16} />} onClick={() => navigate("/coordenador")}>Minha equipe</ViewButton>
            <ViewButton active={location.pathname === "/usuario"} icon={<CalendarDays size={16} />} onClick={() => navigate("/usuario")}>Minhas férias e holerites</ViewButton>
          </>}
        </nav>
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

function ViewButton({ active, icon, children, onClick }) {
  return <button className={`dashboard-view-button${active ? " active" : ""}`} type="button" aria-current={active ? "page" : undefined} onClick={onClick}>{icon}<span>{children}</span></button>;
}
