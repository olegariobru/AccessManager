import { useEffect, useRef, useState } from "react";
import { Banknote, FileKey2, Landmark, RefreshCw, Upload } from "lucide-react";
import { Button } from "../components/Button";
import { DashboardLayout } from "../components/DashboardLayout";
import { api } from "../services/api";
import { validatePdfFile } from "../services/documents";
import { apiErrorMessage, getSession } from "../utils/auth";

const currentYear = new Date().getFullYear();
const typeLabels = {
  PAYSLIP: "Holerite",
  IRPF: "IRPF",
  ITAU_BANK_SLIP: "Boleto Itaú",
};

function initialForm(userId = "") {
  return {
    type: "PAYSLIP",
    userId,
    year: currentYear,
    month: new Date().getMonth() + 1,
    grossAmount: "",
    netAmount: "",
    taxYear: currentYear - 1,
    title: "",
    referenceMonth: new Date().getMonth() + 1,
    dueDate: "",
    amount: "",
    digitableLine: "",
  };
}

function documentDescription(item) {
  if (item.kind === "PAYSLIP") return `${String(item.month).padStart(2, "0")}/${item.year}`;
  if (item.type === "IRPF") return `Ano-base ${item.taxYear}`;
  const dueDate = item.dueDate
    ? new Intl.DateTimeFormat("pt-BR", { timeZone: "UTC" }).format(new Date(item.dueDate))
    : "Sem vencimento";
  return `Vencimento ${dueDate}`;
}

export function DocumentCapture() {
  const publisher = getSession()?.user;
  const fileInput = useRef(null);
  const [users, setUsers] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [form, setForm] = useState(initialForm());
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [success, setSuccess] = useState(false);

  async function loadData(options = {}) {
    setLoading(true);
    if (!options.preserveMessage) {
      setMessage("");
      setSuccess(false);
    }
    try {
      const [usersResponse, payslipsResponse, documentsResponse] = await Promise.all([
        api.get("/clients"),
        api.get("/dashboard/admin/payslips"),
        api.get("/dashboard/admin/client-documents"),
      ]);
      const activeUsers = usersResponse.data.clients || [];
      setUsers(activeUsers);
      setForm((current) => ({ ...current, userId: current.userId || String(activeUsers[0]?.userId || "") }));
      const payslips = (payslipsResponse.data.payslips || []).map((item) => ({ ...item, kind: "PAYSLIP" }));
      const clientDocuments = (documentsResponse.data.documents || []).map((item) => ({ ...item, kind: item.type }));
      setDocuments([...payslips, ...clientDocuments].sort((a, b) => new Date(b.publishedAt || b.createdAt) - new Date(a.publishedAt || a.createdAt)));
    } catch (error) {
      setSuccess(false);
      setMessage(apiErrorMessage(error, "Não foi possível carregar a central de documentos."));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadData(); }, []);

  function updateForm(event) {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  }

  function changeType(event) {
    const userId = form.userId;
    setForm({ ...initialForm(userId), type: event.target.value });
    setFile(null);
    setMessage("");
    if (fileInput.current) fileInput.current.value = "";
  }

  async function submit(event) {
    event.preventDefault();
    setSuccess(false);
    const fileError = validatePdfFile(file);
    if (fileError) {
      setMessage(fileError);
      return;
    }
    setSaving(true);
    setMessage("");
    try {
      const common = { userId: form.userId, originalName: file.name };
      if (form.type === "PAYSLIP") {
        await api.post("/dashboard/admin/payslips", file, {
          params: {
            ...common,
            year: form.year,
            month: form.month,
            grossAmount: form.grossAmount || undefined,
            netAmount: form.netAmount || undefined,
          },
          headers: { "Content-Type": "application/pdf" },
        });
      } else {
        await api.post("/dashboard/admin/client-documents", file, {
          params: {
            ...common,
            type: form.type,
            title: form.title || undefined,
            taxYear: form.type === "IRPF" ? form.taxYear : undefined,
            referenceMonth: form.type === "ITAU_BANK_SLIP" ? form.referenceMonth : undefined,
            dueDate: form.type === "ITAU_BANK_SLIP" ? form.dueDate : undefined,
            amount: form.type === "ITAU_BANK_SLIP" && form.amount ? form.amount : undefined,
            digitableLine: form.type === "ITAU_BANK_SLIP" && form.digitableLine ? form.digitableLine : undefined,
          },
          headers: { "Content-Type": "application/pdf" },
        });
      }
      setFile(null);
      if (fileInput.current) fileInput.current.value = "";
      setSuccess(true);
      setMessage(`${typeLabels[form.type]} publicado com segurança para o cliente.`);
      await loadData({ preserveMessage: true });
    } catch (error) {
      setMessage(apiErrorMessage(error, "Não foi possível publicar o documento."));
    } finally {
      setSaving(false);
    }
  }

  return (
    <DashboardLayout
      title="Central de documentos"
      description={publisher?.isAccounting
        ? "Publique holerites, arquivos de IRPF e boletos emitidos na plataforma Itaú."
        : "Publique holerites e arquivos de IRPF para os clientes."}
    >
      <section className="dashboard-grid document-admin-grid">
        <article className="dashboard-panel">
          <div className="section-heading">
            <div><Upload size={19} /><div><strong>Capturar arquivo</strong><span>Somente PDF, com até 10 MB</span></div></div>
          </div>
          <form className="request-form" onSubmit={submit}>
            <div className="form-row">
              <label>Tipo de documento<select name="type" value={form.type} onChange={changeType}><option value="PAYSLIP">Holerite</option><option value="IRPF">Imposto de renda (IRPF)</option>{publisher?.isAccounting && <option value="ITAU_BANK_SLIP">Boleto Itaú</option>}</select></label>
              <label>Cliente<select required name="userId" value={form.userId} onChange={updateForm}><option value="">Selecione</option>{users.map((client) => <option key={client.id} value={client.userId}>{client.fullName}</option>)}</select></label>
            </div>

            {form.type === "PAYSLIP" && <>
              <div className="form-row"><label>Ano<input required min="2000" max="2200" name="year" type="number" value={form.year} onChange={updateForm} /></label><label>Mês<input required min="1" max="12" name="month" type="number" value={form.month} onChange={updateForm} /></label></div>
              <div className="form-row"><label>Valor bruto (opcional)<input min="0" step="0.01" name="grossAmount" type="number" value={form.grossAmount} onChange={updateForm} /></label><label>Valor líquido (opcional)<input min="0" step="0.01" name="netAmount" type="number" value={form.netAmount} onChange={updateForm} /></label></div>
            </>}

            {form.type === "IRPF" && <div className="form-row"><label>Ano-base<input required min="2000" max="2200" name="taxYear" type="number" value={form.taxYear} onChange={updateForm} /></label><label>Título (opcional)<input maxLength="160" name="title" placeholder={`IRPF ${form.taxYear}`} value={form.title} onChange={updateForm} /></label></div>}

            {form.type === "ITAU_BANK_SLIP" && <>
              <div className="form-row"><label>Vencimento<input required name="dueDate" type="date" value={form.dueDate} onChange={updateForm} /></label><label>Mês de referência<input required min="1" max="12" name="referenceMonth" type="number" value={form.referenceMonth} onChange={updateForm} /></label></div>
              <div className="form-row"><label>Valor (opcional)<input min="0" step="0.01" name="amount" type="number" value={form.amount} onChange={updateForm} /></label><label>Título (opcional)<input maxLength="160" name="title" placeholder="Boleto Itaú" value={form.title} onChange={updateForm} /></label></div>
              <label>Linha digitável (opcional)<input inputMode="numeric" maxLength="64" name="digitableLine" placeholder="44, 47 ou 48 números" value={form.digitableLine} onChange={updateForm} /></label>
            </>}

            <label className="file-field">Arquivo PDF<input ref={fileInput} required accept="application/pdf,.pdf" type="file" onChange={(event) => setFile(event.target.files?.[0] || null)} /><span>{file ? `${file.name} · ${(file.size / 1024 / 1024).toFixed(2)} MB` : "Nenhum arquivo selecionado"}</span></label>
            {message && <p className={`form-message ${success ? "success" : "error"}`} role="status">{message}</p>}
            <Button type="submit" loading={saving}><Upload size={17} /> Publicar para o cliente</Button>
          </form>
        </article>

        <aside className="dashboard-panel document-security-note">
          <FileKey2 size={26} />
          <h2>Entrega privada</h2>
          <p>Somente RH ou Contabilidade publica. O cliente não envia nem altera documentos: pode apenas consultar e capturar os arquivos associados ao próprio cadastro.</p>
          <ul><li>PDF validado no servidor</li><li>Nome interno aleatório</li><li>Download autenticado e auditado</li></ul>
        </aside>
      </section>

      <section className="dashboard-panel list-panel">
        <div className="panel-heading"><div><span><RefreshCw size={18} /> Publicações recentes</span><strong>{documents.length}</strong></div><Button className="button-secondary button-small" type="button" loading={loading} onClick={loadData}><RefreshCw size={16} /> Atualizar</Button></div>
        {!loading && documents.length === 0 ? <p className="empty-state">Nenhum documento publicado.</p> : <div className="request-list">{documents.slice(0, 20).map((item) => <article className="request-item document-row" key={`${item.kind}-${item.id}`}><span className={`request-type request-${item.kind === "ITAU_BANK_SLIP" ? "bank-slip" : item.kind.toLowerCase()}`}>{typeLabels[item.kind]}</span><div><strong>{item.user?.name || "Cliente"} · {documentDescription(item)}</strong><span>{item.file?.originalName || item.title}</span></div><span className="status-badge status-published">Publicado</span></article>)}</div>}
      </section>
    </DashboardLayout>
  );
}
