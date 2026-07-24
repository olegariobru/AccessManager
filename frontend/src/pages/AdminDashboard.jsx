import { useEffect, useState } from "react";
import { RefreshCw, Users } from "lucide-react";
import { DashboardLayout } from "../components/DashboardLayout";
import { Button } from "../components/Button";
import { api } from "../services/api";

export function AdminDashboard() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  async function loadUsers() {
    setLoading(true);
    setMessage("");

    try {
      const { data } = await api.get("/auth/users");
      setUsers(data.users || []);
    } catch (error) {
      setMessage(error.response?.data?.message || error.response?.data?.error || "Não foi possível carregar os usuários.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadUsers();
  }, []);

  return (
    <DashboardLayout
      title="Administração de usuários"
      description="Consulte os usuários cadastrados e seus níveis de acesso."
    >
      <section className="dashboard-panel users-panel">
        <div className="panel-heading">
          <div>
            <span><Users size={18} /> Usuários cadastrados</span>
            <strong>{users.length}</strong>
          </div>
          <Button className="button-secondary button-small" type="button" loading={loading} onClick={loadUsers}>
            <RefreshCw size={17} />
            Atualizar
          </Button>
        </div>

        {message && <p className="form-message error" role="alert">{message}</p>}

        {!loading && !message && (
          <div className="users-table-wrap">
            <table className="users-table">
              <thead>
                <tr>
                  <th>Nome</th>
                  <th>E-mail</th>
                  <th>Perfil</th>
                  <th>Cargo</th>
                  <th>Grupo</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.id}>
                    <td>{user.name}</td>
                    <td>{user.email}</td>
                    <td><span className={`role-badge role-${String(user.role).toLowerCase()}`}>{user.role}</span></td>
                    <td>{user.cargo || "—"}</td>
                    <td>{user.grupo || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </DashboardLayout>
  );
}
