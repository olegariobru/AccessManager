const crypto = require("node:crypto");

function sendError(
  res,
  error,
  fallback = "Não foi possível concluir a operação",
) {
  const status = Number(error.statusCode);
  if (status >= 400 && status < 500) {
    return res.status(status).json({
      error: error.message || fallback,
      ...(error.code ? { code: error.code } : {}),
    });
  }
  if (error.code === "P2002")
    return res
      .status(409)
      .json({ error: "Já existe um cadastro com esses dados" });
  if (["P2025", "P2034"].includes(error.code))
    return res.status(409).json({
      error: "Os dados foram alterados por outra operação. Atualize a página.",
    });
  const incidentId = crypto.randomUUID();
  console.error(
    JSON.stringify({
      event: "INTERNAL_ERROR",
      incidentId,
      type: error.name || "Error",
      code: error.code || "UNKNOWN",
    }),
  );
  return res
    .status(500)
    .json({ error: "Erro interno do servidor", incidentId });
}
module.exports = { sendError };
