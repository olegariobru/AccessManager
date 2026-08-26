import { useEffect, useState } from "react";
import { Check, Clock3, KeyRound, RefreshCw, Search, ShieldCheck, Users, X } from "lucide-react";
import { DashboardLayout } from "../components/DashboardLayout";
import { Button } from "../components/Button";
import { api } from "../services/api";
import { apiErrorMessage } from "../utils/auth";

const roleLabels = {
  ADMIN: "Administrador",
  COORDINATOR: "Coordenador",
  USER: "Funcionário",
};

export function AdminDashboard() {
  const [users, setUsers] = useState([]);
  const [requests, setRequests] = useState([]);
  const [options, setOptions] = useState({ groups: [], positions: [], roles: [] });
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [editing, setEditing] = useState(null);
  const [creating, setCreating] = useState(null);
  const [saving, setSaving] = useState(false);
  const [passwordRequests, setPasswordRequests] = useState([]);
  const [resetting, setResetting] = useState(null);
  const [search, setSearch] = useState("");
  const [appliedSearch, setAppliedSearch] = useState("");

  async function loadDashboard() {
    setLoading(true);
    setMessage("");
    try {
      const [usersResponse, requestsResponse, optionsResponse, passwordResponse] = await Promise.all([
        api.get("/auth/users"),
        api.get("/dashboard/requests"),
        api.get("/auth/organization-options"),
        api.get("/auth/password-reset-requests"),
      ]);
      setUsers(usersResponse.data.users || []);
      setAppliedSearch("");
      setRequests(requestsResponse.data.requests || []);
      setOptions(optionsResponse.data);
      setPasswordRequests(passwordResponse.data.requests || []);
    } catch (error) {
      setMessage(apiErrorMessage(error, "Não foi possível carregar o painel administrativo."));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadDashboard();
  }, []);

  async function searchUsers(event) {
    event.preventDefault();
    const normalizedSearch = search.trim();
    setLoading(true);
    setMessage("");
    try {
      const response = await api.get("/auth/users", {
        params: normalizedSearch ? { search: normalizedSearch } : {},
      });
      setUsers(response.data.users || []);
      setAppliedSearch(normalizedSearch);
    } catch (error) {
      setMessage(apiErrorMessage(error, "Não foi possível pesquisar os usuários."));
    } finally {
      setLoading(false);
    }
  }

  function accessForm(user = {}) {
    return {
      id: user.id,
      name: user.name || "",
      email: user.email || "",
      password: "",
      roleCode: user.role || "USER",
      groupId: user.group?.id || "",
      positionId: user.position?.id || "",
    };
  }

  async function createUser(event) {
    event.preventDefault();
    setSaving(true);
    setMessage("");
    try {
      const { data } = await api.post("/auth/users", {
        ...creating,
        groupId: Number(creating.groupId),
        positionId: Number(creating.positionId),
      });
      setUsers((current) => [...current, data.user]);
      setCreating(null);
    } catch (error) {
      setMessage(apiErrorMessage(error, "Não foi possível criar o usuário."));
    } finally {
      setSaving(false);
    }
  }

  async function saveUser(event) {
    event.preventDefault();
    setSaving(true);
    setMessage("");
    try {
      const { data } = await api.patch(`/auth/users/${editing.id}`, {
        roleCode: editing.roleCode,
        groupId: Number(editing.groupId),
        positionId: Number(editing.positionId),
      });
      setUsers((current) => current.map((user) => user.id === editing.id ? data.user : user));
      setEditing(null);
    } catch (error) {
      setMessage(apiErrorMessage(error, "Não foi possível atualizar o usuário."));
    } finally {
      setSaving(false);
    }
  }

  async function deactivateUser(user) {
    if (!window.confirm(`Inativar o acesso de "${user.name}"? O histórico será preservado.`)) return;
    try {
      await api.delete(`/auth/users/${user.id}`);
      setUsers((current) => current.filter(({ id }) => id !== user.id));
    } catch (error) {
      setMessage(apiErrorMessage(error, "Não foi possível inativar o usuário."));
    }
  }

  async function reviewRequest(id, status) {
    try {
      const { data } = await api.patch(`/dashboard/requests/${id}`, { status });
      setRequests((current) => current.map((request) => request.id === id ? data.request : request));
    } catch (error) {
      setMessage(apiErrorMessage(error, "Não foi possível analisar a solicitação."));
    }
  }

  async function resetPassword(event) {
    event.preventDefault();
    setSaving(true);
    setMessage("");
    try {
      await api.patch("/auth/password-reset-requests", {
        userId: resetting.userId,
        requestId: resetting.requestId || undefined,
        password: resetting.password,
      });
      setPasswordRequests((current) => current.filter(({ id }) => id !== resetting.requestId));
      setResetting(null);
      setMessage("Senha temporária definida. As sessões antigas foram encerradas.");
    } catch (error) {
      setMessage(apiErrorMessage(error, "Não foi possível redefinir a senha."));
    } finally { setSaving(false); }
  }

  const pending = requests.filter(({ status }) => status === "PENDING");
  const coordinators = users.filter(({ role }) => role === "COORDINATOR");

  return (
    <DashboardLayout
      title="Painel administrativo"
      description="Gestão relacional de usuários, perfis, cargos, grupos e solicitações."
    >
      <section className="metric-grid">
        <Metric icon={<Users size={22} />} label="Usuários ativos" value={users.length} />
        <Metric icon={<ShieldCheck size={22} />} label="Coordenadores" value={coordinators.length} />
        <Metric icon={<Clock3 size={22} />} label="Férias pendentes" value={pending.length} />
      </section>

      {message && <p className="form-message error" role="alert">{message}</p>}

      <section className="dashboard-panel users-panel">
        <div className="panel-heading">
          <div><span><Users size={18} /> Gestão de usuários</span><strong>{users.length}</strong></div>
          <div className="toolbar-actions">
            <form className="user-search" role="search" onSubmit={searchUsers}>
              <Search size={16} aria-hidden="true" />
              <input
                aria-label="Pesquisar usuários por nome ou e-mail"
                maxLength={100}
                placeholder="Nome ou e-mail"
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
              <Button className="button-secondary button-small" type="submit" loading={loading}>Pesquisar</Button>
            </form>
            <Button className="button-primary button-small" type="button" onClick={() => setCreating(accessForm())}>
              Adicionar usuário
            </Button>
            <Button className="button-secondary button-small" type="button" loading={loading} onClick={loadDashboard}>
              <RefreshCw size={17} /> Atualizar
            </Button>
          </div>
        </div>
        {!loading && (
          <div className="users-table-wrap">
            {users.length === 0 ? (
              <p className="empty-state">{appliedSearch ? `Nenhum usuário encontrado para "${appliedSearch}".` : "Nenhum usuário ativo."}</p>
            ) : <table className="users-table">
              <thead><tr><th>Nome</th><th>E-mail</th><th>Perfil</th><th>Cargo</th><th>Grupo</th><th>Ações</th></tr></thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.id}>
                    <td>{user.name}</td>
                    <td>{user.email}</td>
                    <td><span className={`role-badge role-${user.role.toLowerCase()}`}>{roleLabels[user.role]}</span></td>
                    <td>{user.position?.name || user.cargo || "—"}</td>
                    <td>{user.group?.name || user.grupo || "—"}</td>
                    <td><div className="table-actions">
                      <button className="table-action" type="button" onClick={() => setEditing(accessForm(user))}>Editar</button>
                      <button className="table-action table-action-key" type="button" onClick={() => setResetting({ userId: user.id, userName: user.name, password: "" })}><KeyRound size={14} /> Redefinir senha</button>
                      <button className="table-action table-action-danger" type="button" onClick={() => deactivateUser(user)}>Inativar</button>
                    </div></td>
                  </tr>
                ))}
              </tbody>
            </table>}
          </div>
        )}
      </section>

      <section className="dashboard-panel list-panel">
        <div className="section-heading"><div><KeyRound size={19} /><div><strong>Recuperação de senha</strong><span>Solicitações pendentes recebidas por e-mail</span></div></div></div>
        {passwordRequests.length === 0 ? <p className="empty-state">Nenhuma solicitação pendente.</p> : (
          <div className="request-list">{passwordRequests.map((request) => (
            <article className="request-item password-reset-item" key={request.id}>
              <span className="request-type request-password"><KeyRound size={16} /> Senha</span>
              <div><strong>{request.user.name}</strong><span>{request.user.email}</span></div>
              <button className="button button-primary button-small password-reset-button" type="button" onClick={() => setResetting({ userId: request.user.id, userName: request.user.name, requestId: request.id, password: "" })}><KeyRound size={16} /> Definir senha temporária</button>
            </article>
          ))}</div>
        )}
      </section>

      <section className="dashboard-panel list-panel">
        <div className="section-heading">
          <div><Clock3 size={19} /><div><strong>Solicitações de férias</strong><span>Histórico preservado por usuário e grupo</span></div></div>
        </div>
        {requests.length === 0 ? <p className="empty-state">Nenhuma solicitação cadastrada.</p> : (
          <div className="request-list">
            {requests.map((request) => (
              <article className="request-item request-item-review" key={request.id}>
                <span className="request-type request-vacation">Férias</span>
                <div><strong>{request.userName}</strong><span>{request.userGroup} · {request.days} dias</span></div>
                <span className={`status-badge status-${request.status.toLowerCase()}`}>{request.status}</span>
                {request.status === "PENDING" && <div className="review-actions">
                  <button className="icon-button approve" type="button" title="Aprovar" onClick={() => reviewRequest(request.id, "APPROVED")}><Check size={17} /></button>
                  <button className="icon-button reject" type="button" title="Recusar" onClick={() => reviewRequest(request.id, "REJECTED")}><X size={17} /></button>
                </div>}
              </article>
            ))}
          </div>
        )}
      </section>

      {(creating || editing) && (
        <AccessModal
          title={creating ? "Adicionar usuário" : "Editar acesso"}
          value={creating || editing}
          options={options}
          saving={saving}
          showIdentity={Boolean(creating)}
          onChange={creating ? setCreating : setEditing}
          onClose={() => creating ? setCreating(null) : setEditing(null)}
          onSubmit={creating ? createUser : saveUser}
        />
      )}
      {resetting && <ResetPasswordModal value={resetting} saving={saving} onChange={setResetting} onClose={() => setResetting(null)} onSubmit={resetPassword} />}
    </DashboardLayout>
  );
}

function ResetPasswordModal({ value, saving, onChange, onClose, onSubmit }) {
  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={onClose}>
      <section className="modal-card" role="dialog" aria-modal="true" onMouseDown={(event) => event.stopPropagation()}>
        <div className="section-heading"><div><KeyRound size={19} /><div><strong>Redefinir senha</strong><span>{value.userName}</span></div></div></div>
        <form className="request-form" onSubmit={onSubmit}>
          <label>Senha temporária<input required type="password" minLength="12" maxLength="128" autoComplete="new-password" value={value.password} onChange={(event) => onChange({ ...value, password: event.target.value })} /></label>
          <p className="empty-state">O usuário deverá criar uma nova senha no próximo acesso. Todas as sessões antigas serão invalidadas.</p>
          <div className="modal-actions"><Button className="button-secondary" type="button" onClick={onClose}>Cancelar</Button><Button type="submit" loading={saving}>Redefinir</Button></div>
        </form>
      </section>
    </div>
  );
}

function Metric({ icon, label, value }) {
  return <article className="metric-card"><span className="metric-icon">{icon}</span><div><span>{label}</span><strong>{value}</strong></div></article>;
}

function AccessModal({ title, value, options, saving, showIdentity, onChange, onClose, onSubmit }) {
  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={onClose}>
      <section className="modal-card" role="dialog" aria-modal="true" onMouseDown={(event) => event.stopPropagation()}>
        <div className="section-heading"><div><ShieldCheck size={19} /><div><strong>{title}</strong><span>Use os cadastros relacionais existentes</span></div></div></div>
        <form className="request-form" onSubmit={onSubmit}>
          {showIdentity && <>
            <label>Nome<input required value={value.name} onChange={(event) => onChange({ ...value, name: event.target.value })} /></label>
            <label>E-mail<input required type="email" value={value.email} onChange={(event) => onChange({ ...value, email: event.target.value })} /></label>
            <label>Senha<input required type="password" minLength="8" value={value.password} onChange={(event) => onChange({ ...value, password: event.target.value })} /></label>
          </>}
          <label>Perfil<select value={value.roleCode} onChange={(event) => onChange({ ...value, roleCode: event.target.value })}>
            {options.roles.map((role) => <option key={role.id} value={role.code}>{roleLabels[role.code]}</option>)}
          </select></label>
          <label>Cargo<select required value={value.positionId} onChange={(event) => onChange({ ...value, positionId: event.target.value })}>
            <option value="" disabled>Selecione</option>
            {options.positions.map((position) => <option key={position.id} value={position.id}>{position.name}</option>)}
          </select></label>
          <label>Grupo<select required value={value.groupId} onChange={(event) => onChange({ ...value, groupId: event.target.value })}>
            <option value="" disabled>Selecione</option>
            {options.groups.map((group) => <option key={group.id} value={group.id}>{group.name}</option>)}
          </select></label>
          <div className="modal-actions">
            <Button className="button-secondary" type="button" disabled={saving} onClick={onClose}>Cancelar</Button>
            <Button type="submit" loading={saving}>Salvar</Button>
          </div>
        </form>
      </section>
    </div>
  );
}
