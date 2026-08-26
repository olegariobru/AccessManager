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

async function listAll(req, res) {
  try {
    return res.status(200).json({ payslips: await payslipService.listAllPayslips(req.user) });
  } catch (error) {
    return sendError(res, error, "Erro ao listar holerites");
  }
}

async function upsert(req, res) {
  try {
    const payslip = await payslipService.upsertPayslip(req.user, req.body);
    return res.status(200).json({ payslip });
  } catch (error) {
    return sendError(res, error, "Erro ao salvar holerite");
  }
}

async function upload(req, res) {
  try {
    const payslip = await payslipService.uploadPayslip(
      req.user,
      req.query,
      req.body,
      req.query.originalName,
    );
    return res.status(201).json({ payslip });
  } catch (error) {
    return sendError(res, error, "Erro ao publicar holerite");
  }
}

async function download(req, res) {
  try {
    const { buffer, file } = await payslipService.downloadPayslip(req.user, req.params.id);
    const encodedName = encodeURIComponent(file.originalName).replace(/'/g, "%27");
    res.set({
      "Content-Type": "application/pdf",
      "Content-Length": String(buffer.length),
      "Content-Disposition": `attachment; filename="documento.pdf"; filename*=UTF-8''${encodedName}`,
      "Cache-Control": "private, no-store, max-age=0",
      "X-Content-Type-Options": "nosniff",
    });
    return res.status(200).send(buffer);
  } catch (error) {
    return sendError(res, error, "Erro ao baixar holerite");
  }
}

module.exports = { list, listOwn, listAll, upsert, upload, download };
