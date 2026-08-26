const nodemailer = require("nodemailer");

let transporter;

function required(name) {
  const value = String(process.env[name] || "").trim();
  if (!value) throw new Error(`Variável de ambiente ${name} não configurada`);
  return value;
}

function getTransporter() {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: required("SMTP_HOST"),
      port: Number(process.env.SMTP_PORT || 587),
      secure: String(process.env.SMTP_SECURE || "false").toLowerCase() === "true",
      auth: {
        user: required("SMTP_USER"),
        pass: required("SMTP_PASS"),
      },
    });
  }
  return transporter;
}

module.exports = { getTransporter };
