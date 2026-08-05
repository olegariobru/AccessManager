import { useEffect, useState } from "react";
import { CalendarCheck, Check, Clock3, RefreshCw, Users, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "../components/Button";
import { DashboardLayout } from "../components/DashboardLayout";
import { api } from "../services/api";

const statusLabels = {
  PENDING_HR: "Aguardando marcação",
  APPROVED: "Férias marcadas",
  REJECTED: "Férias recusadas",
};

function formatDate(value) {
  if (!value) return "—";
  const normalizedValue = /^\d{4}-\d{2}-\d{2}$/.test(String(value))
    ? `${value}T00:00:00`
    : value;
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "medium" }).format(new Date(normalizedValue));
}

export function HrDashboard() {
  const navigate = useNavigate();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [reasons, setReasons] = useState({});
  const [decidingId, setDecidingId] = useState(null);

  async function loadRequests() {
    setLoading(true);
    setMessage("");
    try {
      const { data } = await api.get("/dashboard/hr/requests");
      setRequests(data.requests || []);
    } catch (error) {
      setMessage(error.response?.data?.error || "Não foi possível carregar a fila do RH.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadRequests();
  }, []);

  async function decideVacation(id, status) {
    setMessage("");
    const reason = String(reasons[id] || "").trim();
    if (status === "REJECTED" && !reason) {
      setMessage("Informe o motivo para recusar as férias.");
      return;
    }
    setDecidingId(id);
    try {
      const { data } = await api.patch(`/dashboard/hr/requests/${id}/decision`, { status, reason });
      setRequests((current) => current.map((item) => item.id === id ? data.request : item));
      setReasons((current) => ({ ...current, [id]: "" }));
      setMessage(status === "APPROVED" ? "Férias aprovadas com sucesso." : "Férias recusadas com sucesso.");
    } catch (error) {
      setMessage(error.response?.data?.error || "Não foi possível registrar a decisão.");
    } finally { setDecidingId(null); }
  }

  const pending = requests.filter(({ status }) => status === "PENDING_HR");
  const completed = requests.filter(({ status }) => status === "APPROVED");
  const rejected = requests.filter(({ status }) => status === "REJECTED");

  return (
    <DashboardLayout
      title="Painel do RH"
      description="Analise, aprove ou recuse as férias encaminhadas ao RH."
    >
      <section className="metric-grid">
        <article className="metric-card"><span className="metric-icon"><Clock3 size={22} /></span><div><span>Aguardando marcação</span><strong>{pending.length}</strong></div></article>
        <article className="metric-card"><span className="metric-icon"><CalendarCheck size={22} /></span><div><span>Férias marcadas</span><strong>{completed.length}</strong></div></article>
        <article className="metric-card"><span className="metric-icon"><X size={22} /></span><div><span>Recusadas</span><strong>{rejected.length}</strong></div></article>
      </section>

      <section className="dashboard-panel list-panel">
        <div className="panel-heading">
          <div><span><CalendarCheck size={18} /> Férias liberadas para o RH</span><strong>{requests.length}</strong></div>
          <div className="toolbar-actions">
            <Button className="button-secondary button-small" type="button" onClick={() => navigate("/usuario")}>Minha área</Button>
            <Button className="button-secondary button-small" type="button" loading={loading} onClick={loadRequests}><RefreshCw size={17} /> Atualizar</Button>
          </div>
        </div>
        {message && <p className={`form-message ${message.includes("sucesso") ? "success" : "error"}`} role="status">{message}</p>}
        {!loading && requests.length === 0 ? <p className="empty-state">Nenhuma solicitação aguarda o RH.</p> : (
          <div className="request-list">
            {requests.map((request) => (
              <article className="request-item request-item-review" key={request.id}>
                <span className="request-type request-vacation">Férias</span>
                <div>
                  <strong>{request.userName} · {request.userGroup}</strong>
                  <span>{formatDate(request.startDate)} a {formatDate(request.endDate)} · {request.days} dias</span>
                </div>
                <span className={`status-badge status-${request.status.toLowerCase().replace("_", "-")}`}>{statusLabels[request.status]}</span>
                {request.status === "PENDING_HR" && (
                  <div className="hr-decision-panel">
                    <label>Motivo / observação<textarea rows="2" maxLength="500" placeholder="Obrigatório em caso de recusa" value={reasons[request.id] || ""} onChange={(event) => setReasons((current) => ({ ...current, [request.id]: event.target.value }))} /></label>
                    <div className="review-actions">
                      <button className="button button-primary button-small" disabled={decidingId === request.id} type="button" onClick={() => decideVacation(request.id, "APPROVED")}><Check size={16} /> Aprovar</button>
                      <button className="button button-small hr-reject-button" disabled={decidingId === request.id} type="button" onClick={() => decideVacation(request.id, "REJECTED")}><X size={16} /> Recusar</button>
                    </div>
                  </div>
                )}
              </article>
            ))}
          </div>
        )}
      </section>
    </DashboardLayout>
  );
}
