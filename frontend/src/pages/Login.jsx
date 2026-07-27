import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useForm } from "../hooks/useForm";
import { api } from "../services/api";
import { validateEmail, validatePassword } from "../utils/validation";
import { AuthCard } from "../components/AuthCard";
import { Button } from "../components/Button";
import { InputField } from "../components/InputField";

export function Login() {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const form = useForm({ email: "", password: "" }, (values) => {
    const errors = {
      email: validateEmail(values.email),
      password: validatePassword(values.password)
    };
    return Object.fromEntries(Object.entries(errors).filter(([, value]) => value));
  });

  async function handleSubmit(event) {
    event.preventDefault();
    setMessage("");

    if (!form.isValid()) return;

    setLoading(true);

    try {
      const { data } = await api.post("/auth/login", form.values);

      if (!data.token || !data.user) {
        throw new Error("Resposta inválida");
      }

      // 🔥 SALVA NO CONTEXT + LOCALSTORAGE
      login(data.user, data.token);

      // 🔥 REDIRECIONA
      if (data.user.role === "ADMIN") {
        navigate("/admin", { replace: true });
      } else {
        navigate("/usuario", { replace: true });
      }

    } catch (error) {
      setMessage(
        error.response?.data?.message ||
        error.response?.data?.error ||
        "Erro ao fazer login"
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthCard
      eyebrow="Bem-vindo de volta"
      title="Entre na sua conta"
      description="Use suas credenciais para acessar o sistema"
    >
      <form className="auth-form" onSubmit={handleSubmit} noValidate>

        <InputField
          name="email"
          label="E-mail"
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

        <Link to="/esqueci-minha-senha">Esqueci minha senha</Link>

        {message && <p className="form-message error">{message}</p>}

        <Button type="submit" loading={loading}>
          Entrar
        </Button>

      </form>
    </AuthCard>
  );
}