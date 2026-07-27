import { useEffect, useMemo, useState } from "react";
import {
  Banknote,
  BriefcaseBusiness,
  CalendarCheck,
  Clock3,
  FileText,
  Send,
  Users,
} from "lucide-react";
import { DashboardLayout } from "../components/DashboardLayout";
import { Button } from "../components/Button";
import { api } from "../services/api";
import { getSession } from "../utils/auth";

const requestLabels = {
  VACATION: "Férias",
  PAYSLIP: "Holerite",
};

const statusLabels = {
  PENDING: "Pendente",
  APPROVED: "Aprovada",
  REJECTED: "Recusada",
};

function nextWeekdayDate(day) {
  const today = new Date();
  let candidate = new Date(today.getFullYear(), today.getMonth(), day);

  if (candidate <= today) {
    candidate = new Date(today.getFullYear(), today.getMonth() + 1, day);
  }

  while (candidate.getDay() === 0 || candidate.getDay() === 6) {
    candidate.setDate(candidate.getDate() + 1);
  }

  return candidate;
}

function formatDate(value) {
  if (!value) return "—";
  const normalizedValue = /^\d{4}-\d{2}-\d{2}$/.test(String(value))
    ? `${value}T00:00:00`
    : value;
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "medium" }).format(new Date(normalizedValue));
}

export function UserDashboard() {
  const user = getSession()?.user;
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState("");
  const [form, setForm] = useState({
    type: "VACATION",
    startDate: "",
    endDate: "",
    notes: "",
  });
  const paymentDates = useMemo(() => ({
    salary: nextWeekdayDate(5),
    advance: nextWeekdayDate(20),
  }), []);

  async function loadRequests() {
    setLoading(true);
    try {
      const { data } = await api.get("/dashboard/requests");
      setRequests(data.requests || []);
    } catch (error) {
      setMessage(error.response?.data?.error || "Não foi possível carregar suas solicitações.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadRequests();
  }, []);

  function handleChange(event) {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setSending(true);
    setMessage("");

    try {
      const payload = {
        type: form.type,
        notes: form.notes,
        ...(form.type === "VACATION" && {
          startDate: form.startDate,
          endDate: form.endDate,
        }),
      };
      await api.post("/dashboard/requests", payload);
      setForm({ type: "VACATION", startDate: "", endDate: "", notes: "" });
      setMessage("Solicitação enviada ao coordenador da sua área.");
      await loadRequests();
    } catch (error) {
      setMessage(error.response?.data?.error || "Não foi possível enviar a solicitação.");
    } finally {
      setSending(false);
    }
  }

  return (
    <DashboardLayout
      title={`Olá, ${user?.name || "colaborador"}`}
      description="Acompanhe seus pagamentos e envie solicitações para o coordenador da sua área."
    >
      <section className="metric-grid" aria-label="Resumo do funcionário">
        <article className="metric-card">
          <span className="metric-icon"><Banknote size={22} /></span>
          <div><span>Próximo salário</span><strong>{formatDate(paymentDates.salary)}</strong></div>
        </article>
        <article className="metric-card">
          <span className="metric-icon"><CalendarCheck size={22} /></span>
          <div><span>Próximo vale</span><strong>{formatDate(paymentDates.advance)}</strong></div>
        </article>
        <article className="metric-card">
          <span className="metric-icon"><Clock3 size={22} /></span>
          <div><span>Solicitações pendentes</span><strong>{requests.filter(({ status }) => status === "PENDING").length}</strong></div>
        </article>
      </section>

      <section className="dashboard-grid">
        <article className="dashboard-panel">
          <div className="section-heading">
            <div><Send size={19} /><div><strong>Nova solicitação</strong><span>Será direcionada ao grupo {user?.grupo || "USUARIOS"}</span></div></div>
          </div>
          <form className="request-form" onSubmit={handleSubmit}>
            <label>
              Tipo
              <select name="type" value={form.type} onChange={handleChange}>
                <option value="VACATION">Marcação de férias</option>
                <option value="PAYSLIP">Solicitação de holerite</option>
              </select>
            </label>
            {form.type === "VACATION" && (
              <div className="form-row">
                <label>Início<input required name="startDate" type="date" value={form.startDate} onChange={handleChange} /></label>
                <label>Fim<input required name="endDate" type="date" min={form.startDate} value={form.endDate} onChange={handleChange} /></label>
              </div>
            )}
            <label>
              Observação
              <textarea name="notes" rows="4" maxLength="500" placeholder="Inclua detalhes que ajudem o coordenador." value={form.notes} onChange={handleChange} />
            </label>
            {message && <p className={`form-message ${message.includes("enviada") ? "success" : "error"}`} role="status">{message}</p>}
            <Button type="submit" loading={sending}><Send size={17} /> Enviar solicitação</Button>
          </form>
        </article>

        <article className="dashboard-panel">
          <div className="section-heading">
            <div><BriefcaseBusiness size={19} /><div><strong>Meu perfil</strong><span>Dados da sua conta</span></div></div>
          </div>
          <dl className="profile-list">
            <div><dt><BriefcaseBusiness size={16} /> Cargo</dt><dd>{user?.cargo || "Colaborador"}</dd></div>
            <div><dt><Users size={16} /> Grupo</dt><dd>{user?.grupo || "USUARIOS"}</dd></div>
            <div><dt><FileText size={16} /> Perfil</dt><dd>Funcionário</dd></div>
          </dl>
        </article>
      </section>

      <section className="dashboard-panel list-panel">
        <div className="section-heading">
          <div><FileText size={19} /><div><strong>Minhas solicitações</strong><span>Histórico e andamento</span></div></div>
        </div>
        {loading ? <p className="empty-state">Carregando solicitações...</p> : requests.length === 0 ? (
          <p className="empty-state">Você ainda não enviou nenhuma solicitação.</p>
        ) : (
          <div className="request-list">
            {requests.map((request) => (
              <article className="request-item" key={request.id}>
                <span className={`request-type request-${request.type.toLowerCase()}`}>{requestLabels[request.type]}</span>
                <div>
                  <strong>{request.type === "VACATION" ? `${formatDate(request.startDate)} a ${formatDate(request.endDate)}` : "Holerite solicitado"}</strong>
                  <span>Enviada em {formatDate(request.createdAt)}</span>
                </div>
                <span className={`status-badge status-${request.status.toLowerCase()}`}>{statusLabels[request.status]}</span>
              </article>
            ))}
          </div>
        )}
      </section>
    </DashboardLayout>
  );
}
