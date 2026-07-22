const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateEmail(email) {
  if (!email.trim()) return "Informe seu e-mail.";
  if (!emailPattern.test(email)) return "Digite um e-mail válido.";
  return "";
}

export function validatePassword(password) {
  if (!password) return "Informe sua senha.";
  if (password.length < 8) return "A senha deve ter pelo menos 8 caracteres.";
  return "";
}
