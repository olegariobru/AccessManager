import { useState } from "react";
import { AuthCard } from "../components/AuthCard";
import { Button } from "../components/Button";
import { InputField } from "../components/InputField";
import { useForm } from "../hooks/useForm";
import { api } from "../services/api";
import { validateEmail, validatePassword } from "../utils/validation";

export function Register() {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: "", text: "" });
  const form = useForm({ name: "", email: "", password: "", confirmPassword: "" }, (values) => {
    const errors = {
      name: values.name.trim().length < 3 ? "Informe seu nome completo." : "",
      email: validateEmail(values.email),
      password: validatePassword(values.password),
      confirmPassword: values.confirmPassword !== values.password ? "As senhas não coincidem." : "",
    };
    return Object.fromEntries(Object.entries(errors).filter(([, value]) => value));
  });

  async function handleSubmit(event) {
    event.preventDefault();
    setMessage({ type: "", text: "" });
    if (!form.isValid()) return;
    setLoading(true);
    try {
      await api.post("/auth/register", { name: form.values.name, email: form.values.email, password: form.values.password });
      setMessage({ type: "success", text: "Cadastro realizado. Você já pode entrar." });
      form.setValues({ name: "", email: "", password: "", confirmPassword: "" });
    } catch (error) {
      setMessage({ type: "error", text: error.response?.data?.message || "Não foi possível concluir o cadastro." });
    } finally { setLoading(false); }
  }

  return (
    <AuthCard eyebrow="Comece agora" title="Crie sua conta" description="Preencha os dados abaixo para acessar a plataforma." footerText="Já possui uma conta?" footerLink="/login" footerLabel="Entrar">
      <form className="auth-form" onSubmit={handleSubmit} noValidate>
        <InputField id="register-name" name="name" label="Nome completo" autoComplete="name" placeholder="Seu nome" value={form.values.name} onChange={form.handleChange} error={form.errors.name} />
        <InputField id="register-email" name="email" label="E-mail" type="email" autoComplete="email" placeholder="voce@empresa.com" value={form.values.email} onChange={form.handleChange} error={form.errors.email} />
        <div className="form-row">
          <InputField id="register-password" name="password" label="Senha" type="password" autoComplete="new-password" placeholder="Mínimo 8 caracteres" value={form.values.password} onChange={form.handleChange} error={form.errors.password} />
          <InputField id="register-confirm" name="confirmPassword" label="Confirmar senha" type="password" autoComplete="new-password" placeholder="Repita a senha" value={form.values.confirmPassword} onChange={form.handleChange} error={form.errors.confirmPassword} />
        </div>
        {message.text && <p className={`form-message ${message.type}`} role="alert">{message.text}</p>}
        <Button type="submit" loading={loading}>Criar conta</Button>
      </form>
    </AuthCard>
  );
}
