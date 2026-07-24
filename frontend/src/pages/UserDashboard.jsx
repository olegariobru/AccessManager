import { BriefcaseBusiness, Users } from "lucide-react";
import { DashboardLayout } from "../components/DashboardLayout";
import { getSession } from "../utils/auth";

export function UserDashboard() {
  const user = getSession()?.user;

  return (
    <DashboardLayout
      title={`Olá, ${user?.name || "usuário"}`}
      description="Esta é sua área de acesso no AccessManager."
    >
      <section className="profile-grid" aria-label="Informações do usuário">
        <article className="dashboard-panel">
          <BriefcaseBusiness size={24} />
          <span>Cargo</span>
          <strong>{user?.cargo || "Colaborador"}</strong>
        </article>
        <article className="dashboard-panel">
          <Users size={24} />
          <span>Grupo</span>
          <strong>{user?.grupo || "USUARIOS"}</strong>
        </article>
      </section>
    </DashboardLayout>
  );
}
