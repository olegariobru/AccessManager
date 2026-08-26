import { useEffect, useMemo, useState } from "react";
import { Banknote, Download, FileKey2, FileText, Landmark, RefreshCw, ShieldCheck } from "lucide-react";
import { Button } from "../components/Button";
import { DashboardLayout } from "../components/DashboardLayout";
import { api } from "../services/api";
import { downloadProtectedFile } from "../services/documents";
import { apiErrorMessage, getSession } from "../utils/auth";

const labels = {
  PAYSLIP: "Holerite",
  IRPF: "IRPF",
  ITAU_BANK_SLIP: "Boleto Itaú",
};

function formatDate(value) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "medium", timeZone: "UTC" }).format(new Date(value));
}

function formatMoney(value) {
  if (value == null || value === "") return "";
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Number(value));
}

function details(item) {
  if (item.type === "PAYSLIP") return `Competência ${String(item.month).padStart(2, "0")}/${item.year}`;
  if (item.type === "IRPF") return `Ano-base ${item.taxYear}`;
  return [item.amount ? formatMoney(item.amount) : null, `Vence em ${formatDate(item.dueDate)}`].filter(Boolean).join(" · ");
}

function iconFor(type) {
  if (type === "PAYSLIP") return <Banknote size={22} />;
  if (type === "ITAU_BANK_SLIP") return <Landmark size={22} />;
  return <FileText size={22} />;
}

export function ClientPortal() {
  const user = getSession()?.user;
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState("");
  const [message, setMessage] = useState("");

  async function loadDocuments() {
    setLoading(true);
    setMessage("");
    try {
      const [payslipsResponse, documentsResponse] = await Promise.all([
        api.get("/dashboard/payslips/mine"),
        api.get("/dashboard/client/documents"),
      ]);
      const payslips = (payslipsResponse.data.payslips || []).map((item) => ({
        ...item,
        type: "PAYSLIP",
        downloadUrl: `/dashboard/client/payslips/${item.id}/download`,
      }));
      const clientDocuments = (documentsResponse.data.documents || []).map((item) => ({
        ...item,
        downloadUrl: `/dashboard/client/documents/${item.id}/download`,
      }));
      setDocuments([...payslips, ...clientDocuments].sort((a, b) => new Date(b.publishedAt || b.createdAt) - new Date(a.publishedAt || a.createdAt)));
    } catch (error) {
      setMessage(apiErrorMessage(error, "Não foi possível carregar seus documentos."));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadDocuments(); }, []);

  async function download(item) {
    const key = `${item.type}-${item.id}`;
    setDownloading(key);
    setMessage("");
    try {
      await downloadProtectedFile(item.downloadUrl, item.file?.originalName);
    } catch (error) {
      setMessage(apiErrorMessage(error, "Não foi possível baixar o arquivo."));
    } finally {
      setDownloading("");
    }
  }

  const counts = useMemo(() => ({
    payslips: documents.filter(({ type }) => type === "PAYSLIP").length,
    irpf: documents.filter(({ type }) => type === "IRPF").length,
    bankSlips: documents.filter(({ type }) => type === "ITAU_BANK_SLIP").length,
  }), [documents]);

  return (
    <DashboardLayout
      title="Cliente"
      description={`Consulte e capture os documentos privados disponíveis para ${user?.name || "sua conta"}.`}
    >
      <section className="metric-grid">
        <article className="metric-card"><span className="metric-icon"><Banknote size={22} /></span><div><span>Holerites</span><strong>{counts.payslips}</strong></div></article>
        <article className="metric-card"><span className="metric-icon"><FileText size={22} /></span><div><span>Arquivos de IRPF</span><strong>{counts.irpf}</strong></div></article>
        <article className="metric-card"><span className="metric-icon"><Landmark size={22} /></span><div><span>Boletos Itaú</span><strong>{counts.bankSlips}</strong></div></article>
      </section>

      <section className="client-security-banner"><ShieldCheck size={21} /><div><strong>Acesso protegido</strong><span>Os arquivos são liberados apenas para a sua sessão e cada download fica registrado.</span></div></section>
      {message && <p className="form-message error" role="alert">{message}</p>}

      <section className="dashboard-panel list-panel">
        <div className="panel-heading"><div><span><FileKey2 size={18} /> Meus documentos</span><strong>{documents.length}</strong></div><Button className="button-secondary button-small" type="button" loading={loading} onClick={loadDocuments}><RefreshCw size={16} /> Atualizar</Button></div>
        {loading ? <p className="empty-state">Carregando documentos...</p> : documents.length === 0 ? <p className="empty-state">Nenhum documento foi publicado para sua conta.</p> : (
          <div className="document-card-grid">{documents.map((item) => {
            const key = `${item.type}-${item.id}`;
            return <article className="document-card" key={key}>
              <div className="document-card-icon">{iconFor(item.type)}</div>
              <div className="document-card-body"><span className={`request-type request-${item.type === "ITAU_BANK_SLIP" ? "bank-slip" : item.type.toLowerCase()}`}>{labels[item.type]}</span><h2>{item.type === "PAYSLIP" ? labels[item.type] : item.title}</h2><p>{details(item)}</p><small>{item.file?.originalName} · publicado em {formatDate(item.publishedAt)}</small></div>
              <Button className="button-secondary button-small" type="button" loading={downloading === key} onClick={() => download(item)}><Download size={16} /> Capturar PDF</Button>
            </article>;
          })}</div>
        )}
      </section>
    </DashboardLayout>
  );
}
