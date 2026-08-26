import { useEffect, useState } from "react";
import { Check, Clock3, FileText, RefreshCw, Users, X } from "lucide-react";
import { Navigate } from "react-router-dom";
import { DashboardLayout } from "../components/DashboardLayout";
import { Button } from "../components/Button";
import { api } from "../services/api";
import { getSession } from "../utils/auth";

const statusLabels = {
  PENDING: "Aguardando coordenador",
  PENDING_HR: "Aguardando RH",
  APPROVED: "Férias marcadas",
  REJECTED: "Recusada",
  CANCELLED: "Cancelada",
};

function formatDate(value) {
  if (!value) return "—";
  const normalizedValue = /^\d{4}-\d{2}-\d{2}$/.test(String(value))
    ? `${value}T00:00:00`
    : value;
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "medium" }).format(new Date(normalizedValue));
}

export function CoordinatorDashboard() {
  const coordinator = getSession()?.user;
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  async function loadRequests() {
    setLoading(true);
    setMessage("");
    try {
      const { data } = await api.get("/dashboard/requests");
      setRequests(data.requests || []);
    } catch (error) {
      setMessage(error.response?.data?.error || "Não foi possível carregar as solicitações.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadRequests();
  }, []);

  async function reviewRequest(id, status) {
    setMessage("");
    try {
      const { data } = await api.patch(`/dashboard/requests/${id}`, { status });
      setRequests((current) => current.map((item) => item.id === id ? data.request : item));
    } catch (error) {
      setMessage(error.response?.data?.error || "Não foi possível atualizar a solicitação.");
    }
  }

  const pending = requests.filter(({ status }) => status === "PENDING");
  const vacationCount = pending.length;

  if (coordinator?.isHr) {
    return <Navigate to="/rh" replace />;
  }

  return (
    <DashboardLayout
      title="Painel do coordenador"
      description={`Analise as solicitações dos funcionários do grupo ${coordinator?.grupo || "da sua área"}.`}
    >
      <section className="metric-grid">
        <article className="metric-card"><span className="metric-icon"><Clock3 size={22} /></span><div><span>Pendentes</span><strong>{pending.length}</strong></div></article>
        <article className="metric-card"><span className="metric-icon"><Users size={22} /></span><div><span>Pedidos de férias</span><strong>{vacationCount}</strong></div></article>
        <article className="metric-card"><span className="metric-icon"><FileText size={22} /></span><div><span>Grupos gerenciados</span><strong>{coordinator?.groupIds?.length || 1}</strong></div></article>
      </section>

      <section className="dashboard-panel list-panel">
        <div className="panel-heading">
          <div><span><Users size={18} /> Solicitações da equipe</span><strong>{requests.length}</strong></div>
          <Button className="button-secondary button-small" type="button" loading={loading} onClick={loadRequests}><RefreshCw size={17} /> Atualizar</Button>
        </div>
        {message && <p className="form-message error" role="alert">{message}</p>}
        {!loading && requests.length === 0 ? <p className="empty-state">Nenhuma solicitação foi enviada para o seu grupo.</p> : (
          <div className="request-list">
            {requests.map((request) => (
              <article className="request-item request-item-review" key={request.id}>
                <span className="request-type request-vacation">Férias</span>
                <div>
                  <strong>{request.userName}</strong>
                  <span>{formatDate(request.startDate)} a {formatDate(request.endDate)} · {request.days} dias</span>
                </div>
                <span className={`status-badge status-${request.status.toLowerCase().replace("_", "-")}`}>{statusLabels[request.status]}</span>
                {request.status === "PENDING" && request.userId !== coordinator?.id && (
                  <div className="review-actions">
                    <button className="icon-button approve" type="button" title="Aprovar" onClick={() => reviewRequest(request.id, "APPROVED")}><Check size={17} /></button>
                    <button className="icon-button reject" type="button" title="Recusar" onClick={() => reviewRequest(request.id, "REJECTED")}><X size={17} /></button>
                  </div>
                )}
                {request.userId === coordinator?.id && <span className="self-review-note">Decisão exclusiva do RH</span>}
              </article>
            ))}
          </div>
        )}
      </section>
    </DashboardLayout>
  );
}
