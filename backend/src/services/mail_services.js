const { getTransporter } = require("../config/mail");

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "\"": "&quot;",
    "'": "&#39;",
  })[character]);
}

async function sendPasswordResetRequest({ administrators, user, request }) {
  if (!administrators.length) throw new Error("Nenhum administrador ativo possui e-mail cadastrado");

  const recipients = administrators.map(({ email }) => email).filter(Boolean);
  if (!recipients.length) throw new Error("Nenhum e-mail de administrador está disponível");

  const requestedAt = request.requestedAt.toLocaleString("pt-BR", {
    timeZone: process.env.APP_TIMEZONE || "America/Sao_Paulo",
  });

  return getTransporter().sendMail({
    from: process.env.MAIL_FROM || process.env.SMTP_USER,
    to: recipients,
    subject: `Solicitação de redefinição de senha — ${user.name}`,
    text: [
      "Uma nova solicitação de redefinição de senha foi recebida.",
      `Usuário: ${user.name}`,
      `E-mail: ${user.email}`,
      `Solicitada em: ${requestedAt}`,
      `Identificador: ${request.id}`,
      "Acesse o painel administrativo para validar a solicitação e redefinir a senha.",
    ].join("\n"),
    html: `<h2>Solicitação de redefinição de senha</h2>
      <p>Uma nova solicitação foi recebida.</p>
      <ul>
        <li><strong>Usuário:</strong> ${escapeHtml(user.name)}</li>
        <li><strong>E-mail:</strong> ${escapeHtml(user.email)}</li>
        <li><strong>Solicitada em:</strong> ${escapeHtml(requestedAt)}</li>
        <li><strong>Identificador:</strong> ${escapeHtml(request.id)}</li>
      </ul>
      <p>Acesse o painel administrativo para validar a solicitação e redefinir a senha.</p>`,
  });
}

module.exports = { sendPasswordResetRequest };
