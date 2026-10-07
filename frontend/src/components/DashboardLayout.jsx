import { CalendarDays, ContactRound, Files, LockKeyhole, LogOut, ShieldCheck, Upload, UserRound, UsersRound } from "lucide-react";
import { useState } from "react";
import { api } from "../services/api";
import { useLocation, useNavigate } from "react-router-dom";
import { clearSession, getSession } from "../utils/auth";
import { Logo } from "./Logo";

export function DashboardLayout({ title, description, children }) {
  const navigate = useNavigate();
  const location = useLocation();
  const session = getSession();

  const [logoutError, setLogoutError] = useState("");
  const [loggingOut, setLoggingOut] = useState(false);
  async function handleLogout() {
    setLoggingOut(true);
    setLogoutError("");
    try {
      await api.post("/auth/logout");
      clearSession();
      navigate("/login", { replace: true });
    } catch (error) {
      if (error.response?.status === 401) {
        clearSession(); navigate("/login", { replace: true });
      } else setLogoutError("Não foi possível encerrar a sessão. Tente novamente.");
    } finally { setLoggingOut(false); }
  }

  const roleLabels = { ADMIN: "Administração", COORDINATOR: "Coordenação", USER: "Funcionário", CLIENT: "Cliente" };

  return (
    <div className="dashboard-page">
      <a className="skip-link" href="#dashboard-content">Ir para o conteúdo</a>
      <header className="dashboard-header">
        <Logo />
        <span className="header-caption">Portal de serviços · ASJCOESP</span>
        <div className="dashboard-user">
          <div>
            <strong>{session?.user.name}</strong>
            <span>{roleLabels[session?.user.role] || "Conta"}</span>
          </div>
          <button className="button button-secondary button-small" type="button" onClick={handleLogout} disabled={loggingOut}>
            <LogOut size={17} />
            Sair
          </button>
        </div>
      </header>
      <div className="dashboard-workspace">
        <aside className="dashboard-navigation">
          <p className="navigation-label">Área de trabalho</p>
          <nav className="dashboard-switcher" aria-label="Áreas disponíveis">
            {session?.user.role === "ADMIN" && <>
              <ViewButton active={location.pathname === "/admin"} icon={<ShieldCheck size={16} />} onClick={() => navigate("/admin")}>Administração</ViewButton>
              <ViewButton active={location.pathname === "/admin/clientes"} icon={<ContactRound size={16} />} onClick={() => navigate("/admin/clientes")}>Clientes</ViewButton>
              <ViewButton active={location.pathname === "/usuario"} icon={<UserRound size={16} />} onClick={() => navigate("/usuario")}>Funcionário</ViewButton>
              <ViewButton active={location.pathname === "/coordenador"} icon={<UsersRound size={16} />} onClick={() => navigate("/coordenador")}>Coordenador</ViewButton>
              <ViewButton active={location.pathname === "/rh"} icon={<CalendarDays size={16} />} onClick={() => navigate("/rh")}>RH</ViewButton>
            </>}
            {session?.user.role === "COORDINATOR" && <>
              <ViewButton active={location.pathname === "/coordenador"} icon={<UsersRound size={16} />} onClick={() => navigate("/coordenador")}>Minha equipe</ViewButton>
              <ViewButton active={location.pathname === "/usuario"} icon={<CalendarDays size={16} />} onClick={() => navigate("/usuario")}>Minhas férias e holerites</ViewButton>
            </>}
            {session?.user.role === "USER" && <ViewButton active={location.pathname === "/usuario"} icon={<UserRound size={16} />} onClick={() => navigate("/usuario")}>Área do funcionário</ViewButton>}
            {session?.user.isHr && session?.user.role !== "ADMIN" && <ViewButton active={location.pathname === "/rh"} icon={<CalendarDays size={16} />} onClick={() => navigate("/rh")}>Recursos humanos</ViewButton>}
            {session?.user.isDocumentPublisher && <ViewButton active={location.pathname === "/documentos"} icon={<Upload size={16} />} onClick={() => navigate("/documentos")}>Publicar documentos</ViewButton>}
            {session?.user.role === "CLIENT" && <ViewButton active={location.pathname === "/cliente"} icon={<Files size={16} />} onClick={() => navigate("/cliente")}>Meus arquivos</ViewButton>}
          </nav>
          <div className="navigation-note"><LockKeyhole size={18} /><p>Seu espaço no SERVNET.<br /><span>Serviços conforme seu perfil.</span></p></div>
        </aside>
        <main id="dashboard-content" className="dashboard-main" tabIndex={-1}>
          <div className="dashboard-title">
            <span>SERVNET <span aria-hidden="true">/</span> {roleLabels[session?.user.role] || "Minha conta"}</span>
            <h1>{title}</h1>
            <p>{description}</p>
          </div>
          {logoutError && <p className="form-message error" role="alert">{logoutError}</p>}
          {children}
          <footer className="dashboard-footer">SERVNET / ASJCOESP <span>Portal de serviços</span></footer>
        </main>
      </div>
    </div>
  );
}

function ViewButton({ active, icon, children, onClick }) {
  return <button className={`dashboard-view-button${active ? " active" : ""}`} type="button" aria-current={active ? "page" : undefined} onClick={onClick}>{icon}<span>{children}</span></button>;
}
