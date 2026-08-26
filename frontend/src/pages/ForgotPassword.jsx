import { useState } from "react";
import { AuthCard } from "../components/AuthCard";
import { Button } from "../components/Button";
import { InputField } from "../components/InputField";
import { useForm } from "../hooks/useForm";
import { api } from "../services/api";
import { validateEmail } from "../utils/validation";

export function ForgotPassword() {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const form = useForm({ email: "" }, (values) => {
    const email = validateEmail(values.email);
    return email ? { email } : {};
  });

  async function handleSubmit(event) {
    event.preventDefault();
    setMessage("");
    if (!form.isValid()) return;
    setLoading(true);
    try {
      await api.post("/auth/forgot-password", form.values);
      setMessage("Se o e-mail estiver cadastrado, os administradores receberão a solicitação em instantes.");
    } catch { setMessage("Se o e-mail estiver cadastrado, os administradores receberão a solicitação em instantes."); }
    finally { setLoading(false); }
  }

  return (
    <AuthCard eyebrow="Recuperação de acesso" title="Esqueceu sua senha?" description="Informe seu e-mail para solicitar a redefinição de senha aos administradores." footerText="Lembrou sua senha?" footerLink="/login" footerLabel="Voltar para o login">
      <form className="auth-form" onSubmit={handleSubmit} noValidate>
        <InputField id="forgot-email" name="email" label="E-mail" type="email" autoComplete="email" placeholder="voce@empresa.com" value={form.values.email} onChange={form.handleChange} error={form.errors.email} />
        {message && <p className="form-message success" role="status">{message}</p>}
        <Button type="submit" loading={loading}>Solicitar redefinição</Button>
      </form>
    </AuthCard>
  );
}
