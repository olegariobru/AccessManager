import { useEffect, useState } from "react";
import { KeyRound, RefreshCw, ShieldCheck, UserPlus, Users } from "lucide-react";
import { Button } from "../components/Button";
import { DashboardLayout } from "../components/DashboardLayout";
import { api } from "../services/api";
import { apiErrorMessage } from "../utils/auth";

const emptyForm = {
  fullName: "",
  cpf: "",
  phone: "",
  email: "",
  birthDate: "",
  password: "",
};

function displayDate(value) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("pt-BR", { timeZone: "UTC" }).format(new Date(`${value}T00:00:00Z`));
}

export function ClientAdmin() {
  const [clients, setClients] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [success, setSuccess] = useState(false);

  async function loadClients({ preserveMessage = false } = {}) {
    setLoading(true);
    if (!preserveMessage) {
      setMessage("");
      setSuccess(false);
    }
    try {
      const { data } = await api.get("/clients");
      setClients(data.clients || []);
    } catch (error) {
      setSuccess(false);
      setMessage(apiErrorMessage(error, "Não foi possível carregar os clientes."));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadClients(); }, []);

  function updateForm(event) {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  }

  async function createClient(event) {
    event.preventDefault();
    setSaving(true);
    setMessage("");
    setSuccess(false);
    try {
      const { data } = await api.post("/clients", form);
      setForm(emptyForm);
      setSuccess(true);
      setMessage(data.message || "Cliente criado com sucesso.");
      await loadClients({ preserveMessage: true });
    } catch (error) {
      setMessage(apiErrorMessage(error, "Não foi possível criar o cliente."));
    } finally {
      setSaving(false);
    }
  }

  return (
    <DashboardLayout
      title="Cadastro de clientes"
      description="Crie contas de clientes para receber holerites, IRPF e boletos com acesso privado."
    >
      <section className="dashboard-grid client-admin-grid">
        <article className="dashboard-panel">
          <div className="section-heading">
            <div><UserPlus size={19} /><div><strong>Novo cliente</strong><span>Dados essenciais e credenciais de primeiro acesso</span></div></div>
          </div>
          <form className="request-form" onSubmit={createClient}>
            <label>Nome completo<input required autoComplete="name" maxLength="150" minLength="3" name="fullName" placeholder="Nome e sobrenome" value={form.fullName} onChange={updateForm} /></label>
            <div className="form-row">
              <label>CPF<input required autoComplete="off" inputMode="numeric" maxLength="14" name="cpf" placeholder="000.000.000-00" value={form.cpf} onChange={updateForm} /></label>
              <label>Telefone<input required autoComplete="tel" inputMode="tel" maxLength="20" name="phone" placeholder="(00) 00000-0000" value={form.phone} onChange={updateForm} /></label>
            </div>
            <div className="form-row">
              <label>E-mail de acesso<input required autoComplete="email" maxLength="255" name="email" placeholder="cliente@exemplo.com" type="email" value={form.email} onChange={updateForm} /></label>
              <label>Data de nascimento (opcional)<input max={new Date().toISOString().slice(0, 10)} name="birthDate" type="date" value={form.birthDate} onChange={updateForm} /></label>
            </div>
            <label>Senha temporária<input required autoComplete="new-password" minLength="12" maxLength="128" name="password" placeholder="Mínimo de 12 caracteres" type="password" value={form.password} onChange={updateForm} /></label>
            <p className="form-help"><KeyRound size={15} /> O cliente será obrigado a trocar a senha no primeiro acesso.</p>
            {message && <p className={`form-message ${success ? "success" : "error"}`} role="status">{message}</p>}
            <Button type="submit" loading={saving}><UserPlus size={17} /> Criar cliente</Button>
          </form>
        </article>

        <aside className="dashboard-panel document-security-note">
          <ShieldCheck size={26} />
          <h2>Cadastro protegido</h2>
          <p>O CPF é armazenado para identificação, mas a API e a tela exibem apenas uma versão mascarada. A senha é salva somente como hash.</p>
          <ul><li>Perfil separado de funcionários</li><li>Acesso somente aos próprios arquivos</li><li>Troca obrigatória da senha inicial</li></ul>
        </aside>
      </section>

      <section className="dashboard-panel users-panel list-panel">
        <div className="panel-heading">
          <div><span><Users size={18} /> Clientes ativos</span><strong>{clients.length}</strong></div>
          <Button className="button-secondary button-small" type="button" loading={loading} onClick={() => loadClients()}><RefreshCw size={16} /> Atualizar</Button>
        </div>
        {!loading && (clients.length === 0 ? <p className="empty-state">Nenhum cliente cadastrado.</p> : (
          <div className="users-table-wrap">
            <table className="users-table client-table">
              <thead><tr><th>Nome completo</th><th>CPF</th><th>Telefone</th><th>E-mail</th><th>Nascimento</th><th>Acesso</th></tr></thead>
              <tbody>{clients.map((client) => (
                <tr key={client.id}>
                  <td>{client.fullName}</td>
                  <td>{client.cpfMasked}</td>
                  <td>{client.phone || "—"}</td>
                  <td>{client.email}</td>
                  <td>{displayDate(client.birthDate)}</td>
                  <td><span className={`status-badge ${client.mustChangePassword ? "status-pending" : "status-published"}`}>{client.mustChangePassword ? "Troca pendente" : "Ativo"}</span></td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        ))}
      </section>
    </DashboardLayout>
  );
}
