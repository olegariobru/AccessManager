const nodemailer = require("nodemailer");

let transporter;

function required(name, env = process.env) {
  const value = String(env[name] || "").trim();
  if (!value) throw new Error(`Variável de ambiente ${name} não configurada`);
  return value;
}

function buildTransportOptions(env = process.env) {
    const port = Number(env.SMTP_PORT || 587);
    if (!Number.isInteger(port) || port < 1 || port > 65535) {
      throw new Error("SMTP_PORT inválida");
    }
    const secureText = String(env.SMTP_SECURE || (port === 465 ? "true" : "false")).toLowerCase();
    if (!["true", "false"].includes(secureText)) throw new Error("SMTP_SECURE inválida");
    const secure = secureText === "true";
    return {
      host: required("SMTP_HOST", env),
      port,
      secure,
      requireTLS: !secure,
      tls: { minVersion: "TLSv1.2", rejectUnauthorized: true },
      auth: {
        user: required("SMTP_USER", env),
        pass: required("SMTP_PASS", env),
      },
    };
}

function getTransporter() {
  if (!transporter) {
    transporter = nodemailer.createTransport(buildTransportOptions());
  }
  return transporter;
}

module.exports = { getTransporter, buildTransportOptions };
