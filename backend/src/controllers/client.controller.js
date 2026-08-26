const clientService = require("../services/client.services");

function sendError(res, error, fallback) {
  if (error.statusCode) {
    return res.status(error.statusCode).json({ error: error.message || fallback });
  }
  if (error.code === "P2002") {
    return res.status(409).json({ error: "E-mail ou CPF já cadastrado" });
  }
  console.error(fallback, error);
  return res.status(500).json({ error: fallback });
}

async function list(req, res) {
  try {
    return res.status(200).json({ clients: await clientService.listClients(req.user) });
  } catch (error) {
    return sendError(res, error, "Erro ao listar clientes");
  }
}

async function create(req, res) {
  try {
    const client = await clientService.createClient(req.body, req.user);
    return res.status(201).json({
      client,
      message: "Cliente criado. A senha temporária deverá ser alterada no primeiro acesso.",
    });
  } catch (error) {
    return sendError(res, error, "Erro ao criar cliente");
  }
}

module.exports = { create, list };
