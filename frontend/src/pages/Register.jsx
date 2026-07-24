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

  const form = useForm(
    {
      name: "",
      email: "",
      password: "",
      confirmPassword: "",
      cargo: "Colaborador",
      grupo: "USUARIOS"
    },
    (values) => {
      const errors = {
        name: values.name.trim().length < 6 ? "Digite seu nome completo." : "",
        email: validateEmail(values.email),
        password: validatePassword(values.password),
        confirmPassword:
          values.confirmPassword !== values.password
            ? "As senhas não coincidem."
            : "",
      };

      return Object.fromEntries(
        Object.entries(errors).filter(([, value]) => value)
      );
    }
  );

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
        cargo: form.values.cargo,
        grupo: form.values.grupo
      });

      setMessage({
        type: "success",
        text: "Cadastro realizado com sucesso!"
      });

      form.setValues({
        name: "",
        email: "",
        password: "",
        confirmPassword: "",
        cargo: "Colaborador",
        grupo: "USUARIOS"
      });

      setTimeout(() => {
        window.location.href = "/login";
      }, 2000);

    } catch (error) {
      setMessage({
        type: "error",
        text:
          error.response?.data?.message ||
          "Erro ao cadastrar usuário."
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthCard
      eyebrow="Comece agora"
      title="Crie sua conta"
      description="Preencha os dados abaixo"
    >
      <form className="auth-form" onSubmit={handleSubmit} noValidate>

        <InputField
          name="name"
          label="Nome"
          value={form.values.name}
          onChange={form.handleChange}
          error={form.errors.name}
        />

        <InputField
          name="email"
          label="Email"
          type="email"
          value={form.values.email}
          onChange={form.handleChange}
          error={form.errors.email}
        />

        <InputField
          name="password"
          label="Senha"
          type="password"
          value={form.values.password}
          onChange={form.handleChange}
          error={form.errors.password}
        />

        <InputField
          name="confirmPassword"
          label="Confirmar Senha"
          type="password"
          value={form.values.confirmPassword}
          onChange={form.handleChange}
          error={form.errors.confirmPassword}
        />

        {/* FUTURO SELECT */}
        {/* Aqui você pode trocar por dropdown depois */}

        <InputField
          name="cargo"
          label="Cargo"
          value={form.values.cargo}
          onChange={form.handleChange}
        />

        <InputField
          name="grupo"
          label="Grupo"
          value={form.values.grupo}
          onChange={form.handleChange}
        />

        {message.text && (
          <p className={`form-message ${message.type}`}>
            {message.text}
          </p>
        )}

        <Button type="submit" loading={loading}>
          Criar conta
        </Button>
      </form>
    </AuthCard>
  );
}
