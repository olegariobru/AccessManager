import { useEffect, useState } from "react";
import { Check, Clock3, RefreshCw, ShieldCheck, Users, X } from "lucide-react";
import { DashboardLayout } from "../components/DashboardLayout";
import { Button } from "../components/Button";
import { api } from "../services/api";

const roleLabels = {
  ADMIN: "Administrador",
  COORDINATOR: "Coordenador",
  USER: "Funcionário",
};

const requestLabels = { VACATION: "Férias", PAYSLIP: "Holerite" };

export function AdminDashboard() {
  const [users, setUsers] = useState([]);
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [editing, setEditing] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [creating, setCreating] = useState(null);
  const [creatingUser, setCreatingUser] = useState(false);

  async function loadDashboard() {
    setLoading(true);
    setMessage("");
    try {
      const [usersResponse, requestsResponse] = await Promise.all([
        api.get("/auth/users"),
        api.get("/dashboard/requests"),
      ]);
      setUsers(usersResponse.data.users || []);
      setRequests(requestsResponse.data.requests || []);
    } catch (error) {
      setMessage(
        error.response?.data?.error ||
          "Não foi possível carregar o painel administrativo.",
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadDashboard();
  }, []);

  async function saveUser(event) {
    event.preventDefault();
    try {
      const { data } = await api.patch(`/auth/users/${editing.id}`, editing);
      setUsers((current) =>
        current.map((user) => (user.id === editing.id ? data.user : user)),
      );
      setEditing(null);
    } catch (error) {
      setMessage(
        error.response?.data?.error || "Não foi possível atualizar o usuário.",
      );
    }
  }

  async function reviewRequest(id, status) {
    try {
      const { data } = await api.patch(`/dashboard/requests/${id}`, { status });
      setRequests((current) =>
        current.map((request) => (request.id === id ? data.request : request)),
      );
    } catch (error) {
      setMessage(
        error.response?.data?.error ||
          "Não foi possível atualizar a solicitação.",
      );
    }
  }
  async function deleteUser(user) {
    const confirmed = window.confirm(
      `Tem certeza que deseja excluir o usuário "${user.name}"?\n\nEssa ação não poderá ser desfeita.`,
    );

    if (!confirmed) {
      return;
    }

    setDeletingId(user.id);
    setMessage("");

    try {
      await api.delete(`/auth/users/${user.id}`);

      setUsers((currentUsers) =>
        currentUsers.filter((currentUser) => currentUser.id !== user.id),
      );
    } catch (error) {
      setMessage(
        error.response?.data?.error || "Não foi possível excluir o usuário.",
      );
    } finally {
      setDeletingId(null);
    }
  }
  async function createUser(event) {
    event.preventDefault();
    if (creatingUser) {
      return;
    }
    setCreatingUser(true);
    setMessage("");

    try {
      const { data } = await api.post("/auth/users", creating);
      setUsers((currentUsers) => [...currentUsers, data.user]);
      setCreating(null);
    } catch (error) {
      setMessage(
        error.response?.data?.error ||
          error.response?.data?.message ||
          "Não foi possível criar o usuário.",
      );
    } finally {
      setCreatingUser(false);
    }
  }

  const pending = requests.filter(({ status }) => status === "PENDING");
  const coordinators = users.filter(
    ({ role }) => String(role).toUpperCase() === "COORDINATOR",
  );

  return (
    <DashboardLayout
      title="Painel administrativo"
      description="Visão global da plataforma, dos acessos e das solicitações."
    >
      <section className="metric-grid">
        <article className="metric-card">
          <span className="metric-icon">
            <Users size={22} />
          </span>
          <div>
            <span>Usuários</span>
            <strong>{users.length}</strong>
          </div>
        </article>
        <article className="metric-card">
          <span className="metric-icon">
            <ShieldCheck size={22} />
          </span>
          <div>
            <span>Coordenadores</span>
            <strong>{coordinators.length}</strong>
          </div>
        </article>
        <article className="metric-card">
          <span className="metric-icon">
            <Clock3 size={22} />
          </span>
          <div>
            <span>Solicitações pendentes</span>
            <strong>{pending.length}</strong>
          </div>
        </article>
      </section>

      <section className="dashboard-panel users-panel">
        <div className="panel-heading">
          <div>
            <span>
              <Users size={18} /> Gestão de usuários
            </span>
            <strong>{users.length}</strong>
          </div>
          <Button
            className="button-primary button-small"
            type="button"
            onClick={() =>
              setCreating({
                name: "",
                email: "",
                password: "",
                role: "",
                cargo: "",
                grupo: "",
              })
            }
          >
            Adicionar usuário
          </Button>
          <Button
            className="button-secondary button-small"
            type="button"
            loading={loading}
            onClick={loadDashboard}
          >
            <RefreshCw size={17} /> Atualizar
          </Button>
        </div>
        {message && (
          <p className="form-message error" role="alert">
            {message}
          </p>
        )}
        {!loading && (
          <div className="users-table-wrap">
            <table className="users-table">
              <thead>
                <tr>
                  <th>Nome</th>
                  <th>E-mail</th>
                  <th>Perfil</th>
                  <th>Cargo</th>
                  <th>Grupo</th>
                  <th>Ação</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.id}>
                    <td>{user.name}</td>
                    <td>{user.email}</td>
                    <td>
                      <span
                        className={`role-badge role-${String(user.role).toLowerCase()}`}
                      >
                        {roleLabels[String(user.role).toUpperCase()] ||
                          user.role}
                      </span>
                    </td>
                    <td>{user.cargo || "—"}</td>
                    <td>{user.grupo || "—"}</td>
                    <td>
                      <div className="table-actions">
                        <button
                          className="table-action"
                          type="button"
                          onClick={() => setEditing({ ...user })}
                          disabled={deletingId === user.id}
                        >
                          Editar
                        </button>

                        <button
                          className="table-action table-action-danger"
                          type="button"
                          onClick={() => deleteUser(user)}
                          disabled={deletingId !== null}
                        >
                          {deletingId === user.id ? "Excluindo..." : "Excluir"}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="dashboard-panel list-panel">
        <div className="section-heading">
          <div>
            <Clock3 size={19} />
            <div>
              <strong>Solicitações da plataforma</strong>
              <span>Visão irrestrita para administração</span>
            </div>
          </div>
        </div>
        {requests.length === 0 ? (
          <p className="empty-state">Nenhuma solicitação cadastrada.</p>
        ) : (
          <div className="request-list">
            {requests.map((request) => (
              <article
                className="request-item request-item-review"
                key={request.id}
              >
                <span
                  className={`request-type request-${request.type.toLowerCase()}`}
                >
                  {requestLabels[request.type]}
                </span>
                <div>
                  <strong>{request.userName}</strong>
                  <span>
                    {request.userGroup} · {request.userEmail}
                  </span>
                </div>
                <span
                  className={`status-badge status-${request.status.toLowerCase()}`}
                >
                  {request.status}
                </span>
                {request.status === "PENDING" && (
                  <div className="review-actions">
                    <button
                      className="icon-button approve"
                      type="button"
                      title="Aprovar"
                      onClick={() => reviewRequest(request.id, "APPROVED")}
                    >
                      <Check size={17} />
                    </button>
                    <button
                      className="icon-button reject"
                      type="button"
                      title="Recusar"
                      onClick={() => reviewRequest(request.id, "REJECTED")}
                    >
                      <X size={17} />
                    </button>
                  </div>
                )}
              </article>
            ))}
          </div>
        )}
      </section>

      {creating && (
        <div
          className="modal-backdrop"
          role="presentation"
          onMouseDown={() => {
            if (!creatingUser) {
              setCreating(null);
            }
          }}
        >
          <section
            className="modal-card"
            role="dialog"
            aria-modal="true"
            aria-labelledby="create-user-title"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="section-heading">
              <div>
                <Users size={19} />
                <div>
                  <strong id="create-user-title">Adicionar usuário</strong>
                  <span>Cadastre um novo acesso</span>
                </div>
              </div>
            </div>

            <form className="request-form" onSubmit={createUser}>
              <label>
                Nome
                <input
                  required
                  maxLength="100"
                  value={creating.name}
                  onChange={(event) =>
                    setCreating({
                      ...creating,
                      name: event.target.value,
                    })
                  }
                />
              </label>

              <label>
                E-mail
                <input
                  required
                  type="email"
                  maxLength="150"
                  value={creating.email}
                  onChange={(event) =>
                    setCreating({
                      ...creating,
                      email: event.target.value,
                    })
                  }
                />
              </label>

              <label>
                Senha
                <input
                  required
                  type="password"
                  minLength="8"
                  maxLength="128"
                  value={creating.password}
                  onChange={(event) =>
                    setCreating({
                      ...creating,
                      password: event.target.value,
                    })
                  }
                />
              </label>

              <label>
                Perfil
                <select
                  required
                  value={creating.role}
                  onChange={(event) =>
                    setCreating({
                      ...creating,
                      role: event.target.value,
                    })
                  }
                >
                  <option value="" disabled >
                    Selecione um perfil 
                  </option> 

                  <option value="USER">Funcionário</option>
                  <option value="COORDINATOR">Coordenador</option>
                  <option value="ADMIN">Administrador</option>
                </select>
              </label>

              <label>
                Cargo
                <input
                  required
                  maxLength="100"
                  value={creating.cargo}
                  onChange={(event) =>
                    setCreating({
                      ...creating,
                      cargo: event.target.value,
                    })
                  }
                />
              </label>

              <label>
                Grupo
                <input
                  required
                  maxLength="100"
                  value={creating.grupo}
                  onChange={(event) =>
                    setCreating({
                      ...creating,
                      grupo: event.target.value,
                    })
                  }
                />
              </label>

              <div className="modal-actions">
                <Button
                  className="button-secondary"
                  type="button"
                  disabled={creatingUser}
                  onClick={() => setCreating(null)}
                >
                  Cancelar
                </Button>

                <Button type="submit" loading={creatingUser}>
                  Criar usuário
                </Button>
              </div>
            </form>
          </section>
        </div>
      )}

      {editing && (
        <div
          className="modal-backdrop"
          role="presentation"
          onMouseDown={() => setEditing(null)}
        >
          <section
            className="modal-card"
            role="dialog"
            aria-modal="true"
            aria-labelledby="edit-user-title"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="section-heading">
              <div>
                <ShieldCheck size={19} />
                <div>
                  <strong id="edit-user-title">Editar acesso</strong>
                  <span>{editing.name}</span>
                </div>
              </div>
            </div>
            <form className="request-form" onSubmit={saveUser}>
              <label>
                Perfil
                <select
                  value={editing.role}
                  onChange={(event) =>
                    setEditing({ ...editing, role: event.target.value })
                  }
                >
                  <option value="USER">Funcionário</option>
                  <option value="COORDINATOR">Coordenador</option>
                  <option value="ADMIN">Administrador</option>
                </select>
              </label>
              <label>
                Cargo
                <input
                  required
                  maxLength="100"
                  value={editing.cargo || ""}
                  onChange={(event) =>
                    setEditing({ ...editing, cargo: event.target.value })
                  }
                />
              </label>
              <label>
                Grupo
                <input
                  required
                  maxLength="100"
                  value={editing.grupo || ""}
                  onChange={(event) =>
                    setEditing({ ...editing, grupo: event.target.value })
                  }
                />
              </label>
              <div className="modal-actions">
                <Button
                  className="button-secondary"
                  type="button"
                  onClick={() => setEditing(null)}
                >
                  Cancelar
                </Button>
                <Button type="submit">Salvar alterações</Button>
              </div>
            </form>
          </section>
        </div>
      )}
    </DashboardLayout>
  );
}
