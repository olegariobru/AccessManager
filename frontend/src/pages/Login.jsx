import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AuthCard } from "../components/AuthCard";
import { Button } from "../components/Button";
import { InputField } from "../components/InputField";
import { useForm } from "../hooks/useForm";
import { api } from "../services/api";
import { apiErrorMessage, roleDestination, saveSession } from "../utils/auth";
import { validateEmail, validatePassword } from "../utils/validation";

export function Login() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const form = useForm({ email: "", password: "" }, (values) => {
    const errors = { email: validateEmail(values.email), password: validatePassword(values.password) };
    return Object.fromEntries(Object.entries(errors).filter(([, value]) => value));
  });

  async function handleSubmit(event) {
    event.preventDefault();
    setMessage("");
    if (!form.isValid()) return;
    setLoading(true);
    try {
      const { data } = await api.post("/auth/login", form.values);
      if (!data.token || !data.user) throw new Error("Resposta de autenticação inválida");

      saveSession(data.token, data.user);
      navigate(data.user.mustChangePassword ? "/alterar-senha" : roleDestination(data.user), { replace: true });
    } catch (error) {
      setMessage(apiErrorMessage(error, "Não foi possível entrar. Verifique os dados ou tente novamente."));
    } finally { setLoading(false); }
  }

  return (
    <AuthCard eyebrow="Bem-vindo de volta" title="Entre na sua conta" description="Use suas credenciais para acessar o AccessManager." footerText="Ainda não tem uma conta?" footerLink="/cadastro" footerLabel="Cadastre-se">
      <form className="auth-form" onSubmit={handleSubmit} noValidate>
        <InputField id="login-email" name="email" label="E-mail" type="email" autoComplete="email" placeholder="voce@empresa.com" value={form.values.email} onChange={form.handleChange} error={form.errors.email} />
        <InputField id="login-password" name="password" label="Senha" type="password" autoComplete="current-password" placeholder="Sua senha" value={form.values.password} onChange={form.handleChange} error={form.errors.password} />
        <Link className="forgot-link" to="/esqueci-minha-senha">Esqueci minha senha</Link>
        {message && <p className="form-message error" role="alert">{message}</p>}
        <Button type="submit" loading={loading}>Entrar</Button>
      </form>
    </AuthCard>
  );

}
