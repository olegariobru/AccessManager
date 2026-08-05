const requestService = require("../services/request.services");

function sendError(res, error, fallback) {
  return res.status(error.statusCode || 500).json({ error: error.message || fallback });
}

async function create(req, res) {
  try {
    return res.status(201).json({ request: await requestService.createRequest(req.user, req.body) });
  } catch (error) {
    return sendError(res, error, "Erro ao criar solicitação");
  }
}

async function list(req, res) {
  try {
    return res.status(200).json({ requests: await requestService.listRequests(req.user) });
  } catch (error) {
    return sendError(res, error, "Erro ao listar solicitações");
  }
}

async function listOwn(req, res) {
  try {
    return res.status(200).json({ requests: await requestService.listOwnRequests(req.user) });
  } catch (error) { return sendError(res, error, "Erro ao listar suas solicitações"); }
}

async function listHr(req, res) {
  try {
    return res.status(200).json({ requests: await requestService.listHrRequests(req.user) });
  } catch (error) {
    return sendError(res, error, "Erro ao listar a fila do RH");
  }
}

async function review(req, res) {
  try {
    const request = await requestService.reviewRequest(req.user, req.params.id, req.body);
    return res.status(200).json({ request });
  } catch (error) {
    return sendError(res, error, "Erro ao analisar solicitação");
  }
}

async function cancel(req, res) {
  try {
    const request = await requestService.cancelRequest(req.user, req.params.id, req.body?.reason);
    return res.status(200).json({ request });
  } catch (error) {
    return sendError(res, error, "Erro ao cancelar solicitação");
  }
}

async function markByHr(req, res) {
  try {
    const request = await requestService.markRequestByHr(req.user, req.params.id, req.body);
    return res.status(200).json({ request });
  } catch (error) {
    return sendError(res, error, "Erro ao marcar férias");
  }
}

async function decideByHr(req, res) {
  try {
    const request = await requestService.decideRequestByHr(req.user, req.params.id, req.body);
    return res.status(200).json({ request });
  } catch (error) { return sendError(res, error, "Erro ao decidir sobre as férias"); }
}

module.exports = { create, list, listOwn, listHr, review, markByHr, decideByHr, cancel };
