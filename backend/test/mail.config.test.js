const test = require("node:test");
const assert = require("node:assert/strict");
const { buildTransportOptions } = require("../src/config/mail");

const credentials = {
  SMTP_HOST: "smtp.example.test",
  SMTP_USER: "notifier@example.test",
  SMTP_PASS: "test-secret",
};

test("SMTP exige STARTTLS e TLS 1.2 por padrão", () => {
  assert.deepEqual(buildTransportOptions(credentials), {
    host: "smtp.example.test",
    port: 587,
    secure: false,
    requireTLS: true,
    tls: { minVersion: "TLSv1.2", rejectUnauthorized: true },
    auth: { user: "notifier@example.test", pass: "test-secret" },
  });
});

test("SMTP 465 usa TLS implícito e configurações inválidas são recusadas", () => {
  assert.equal(buildTransportOptions({ ...credentials, SMTP_PORT: "465" }).secure, true);
  assert.equal(buildTransportOptions({ ...credentials, SMTP_PORT: "465" }).requireTLS, false);
  assert.throws(() => buildTransportOptions({ ...credentials, SMTP_PORT: "65536" }), /SMTP_PORT/);
  assert.throws(() => buildTransportOptions({ ...credentials, SMTP_SECURE: "maybe" }), /SMTP_SECURE/);
});
