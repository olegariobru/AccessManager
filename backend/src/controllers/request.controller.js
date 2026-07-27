const requestService = require("../services/request.services");

async function create(req, res) {
  try {
    const request = await requestService.createRequest(req.user, req.body);
    return res.status(201).json({ request });
  } catch (error) {
    return res.status(error.statusCode || 500).json({ error: error.message || "Erro ao criar solicitação" });
  }
}

async function list(req, res) {
  try {
    const requests = await requestService.listRequests(req.user);
    return res.status(200).json({ requests });
  } catch (error) {
    return res.status(error.statusCode || 500).json({ error: error.message || "Erro ao listar solicitações" });
  }
}

async function review(req, res) {
  try {
    const request = await requestService.reviewRequest(req.user, req.params.id, req.body.status);
    return res.status(200).json({ request });
  } catch (error) {
    return res.status(error.statusCode || 500).json({ error: error.message || "Erro ao analisar solicitação" });
  }
}

module.exports = { create, list, review };
