import { useEffect, useState } from "react";
import { AuthCard } from "../components/AuthCard";
import { Button } from "../components/Button";
import { InputField } from "../components/InputField";
import { useForm } from "../hooks/useForm";
import { api } from "../services/api";
import { apiErrorMessage } from "../utils/auth";
import { validateEmail, validatePassword } from "../utils/validation";

export function Register() {
  const [options, setOptions] = useState({ groups: [], positions: [] });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: "", text: "" });
  const form = useForm(
    {
      name: "",
      email: "",
      password: "",
      confirmPassword: "",
      groupId: "",
      positionId: "",
    },
    (values) => {
      const errors = {
        name: values.name.trim().length < 3 ? "Digite seu nome completo." : "",
        email: validateEmail(values.email),
        password: validatePassword(values.password),
        confirmPassword: values.confirmPassword !== values.password ? "As senhas não coincidem." : "",
        groupId: values.groupId ? "" : "Selecione um grupo.",
        positionId: values.positionId ? "" : "Selecione um cargo.",
      };
      return Object.fromEntries(Object.entries(errors).filter(([, value]) => value));
    },
  );

  useEffect(() => {
    api.get("/auth/organization-options")
      .then(({ data }) => setOptions(data))
      .catch(() => setMessage({ type: "error", text: "Não foi possível carregar grupos e cargos." }));
  }, []);

  async function handleSubmit(event) {
    event.preventDefault();
    setMessage({ type: "", text: "" });
    if (!form.isValid()) return;
    setLoading(true);
    try {
      await api.post("/auth/register", {
        name: form.values.name,
        email: form.values.email,
        password: form.values.password,
        groupId: Number(form.values.groupId),
        positionId: Number(form.values.positionId),
      });
      setMessage({ type: "success", text: "Cadastro realizado com sucesso!" });
      setTimeout(() => window.location.assign("/login"), 1500);
    } catch (error) {
      setMessage({ type: "error", text: apiErrorMessage(error, "Erro ao cadastrar usuário.") });
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthCard
      eyebrow="Comece agora"
      title="Crie sua conta"
      description="Grupo e cargo usam os cadastros oficiais da organização."
      footerText="Já possui acesso?"
      footerLink="/login"
      footerLabel="Entrar"
    >
      <form className="auth-form" onSubmit={handleSubmit} noValidate>
        <InputField name="name" label="Nome completo" value={form.values.name} onChange={form.handleChange} error={form.errors.name} />
        <InputField name="email" label="E-mail" type="email" value={form.values.email} onChange={form.handleChange} error={form.errors.email} />
        <InputField name="password" label="Senha" type="password" value={form.values.password} onChange={form.handleChange} error={form.errors.password} />
        <InputField name="confirmPassword" label="Confirmar senha" type="password" value={form.values.confirmPassword} onChange={form.handleChange} error={form.errors.confirmPassword} />
        <label className="field">
          <span>Grupo</span>
          <select name="groupId" value={form.values.groupId} onChange={form.handleChange} aria-invalid={Boolean(form.errors.groupId)}>
            <option value="">Selecione</option>
            {options.groups.map((group) => <option key={group.id} value={group.id}>{group.name}</option>)}
          </select>
          {form.errors.groupId && <small className="field-error">{form.errors.groupId}</small>}
        </label>
        <label className="field">
          <span>Cargo</span>
          <select name="positionId" value={form.values.positionId} onChange={form.handleChange} aria-invalid={Boolean(form.errors.positionId)}>
            <option value="">Selecione</option>
            {options.positions.map((position) => <option key={position.id} value={position.id}>{position.name}</option>)}
          </select>
          {form.errors.positionId && <small className="field-error">{form.errors.positionId}</small>}
        </label>
        {message.text && <p className={`form-message ${message.type}`} role="status">{message.text}</p>}
        <Button type="submit" loading={loading}>Criar conta</Button>
      </form>
    </AuthCard>
  );
}
