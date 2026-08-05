const payslipService = require("../services/payslip.services");

function sendError(res, error, fallback) {
  return res.status(error.statusCode || 500).json({ error: error.message || fallback });
}

async function list(req, res) {
  try {
    return res.status(200).json({ payslips: await payslipService.listPayslips(req.user) });
  } catch (error) {
    return sendError(res, error, "Erro ao listar holerites");
  }
}

async function listOwn(req, res) {
  try {
    return res.status(200).json({ payslips: await payslipService.listOwnPayslips(req.user) });
  } catch (error) { return sendError(res, error, "Erro ao listar seus holerites"); }
}

async function upsert(req, res) {
  try {
    const payslip = await payslipService.upsertPayslip(req.user, req.body);
    return res.status(200).json({ payslip });
  } catch (error) {
    return sendError(res, error, "Erro ao salvar holerite");
  }
}

module.exports = { list, listOwn, upsert };
