import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { AuthCard } from "../components/AuthCard";
import { Button } from "../components/Button";
import { InputField } from "../components/InputField";
import { api } from "../services/api";
import { clearSession } from "../utils/auth";

export function ChangePassword() {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setMessage("");
    if (password.length < 12) return setMessage("A senha deve ter pelo menos 12 caracteres.");
    if (password !== confirmation) return setMessage("As senhas não coincidem.");
    setLoading(true);
    try {
      await api.post("/auth/change-password", { password });
      clearSession();
      navigate("/login", { replace: true, state: { passwordChanged: true } });
    } catch (error) {
      setMessage(error.response?.data?.error || "Não foi possível alterar a senha.");
    } finally { setLoading(false); }
  }

  return (
    <AuthCard eyebrow="Segurança" title="Crie uma nova senha" description="A senha temporária deve ser substituída antes de continuar.">
      <form className="auth-form" onSubmit={handleSubmit}>
        <InputField name="password" label="Nova senha" type="password" autoComplete="new-password" value={password} onChange={(event) => setPassword(event.target.value)} />
        <InputField name="confirmation" label="Confirmar nova senha" type="password" autoComplete="new-password" value={confirmation} onChange={(event) => setConfirmation(event.target.value)} />
        {message && <p className="form-message error" role="alert">{message}</p>}
        <Button type="submit" loading={loading}>Alterar senha</Button>
      </form>
    </AuthCard>
  );
}
