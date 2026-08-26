const clientDocumentService = require("../services/client-document.services");

function sendError(res, error, fallback) {
  return res.status(error.statusCode || 500).json({ error: error.message || fallback });
}

async function listOwn(req, res) {
  try {
    const documents = await clientDocumentService.listOwnDocuments(req.user);
    return res.status(200).json({ documents });
  } catch (error) {
    return sendError(res, error, "Erro ao listar documentos");
  }
}

async function listAll(req, res) {
  try {
    const documents = await clientDocumentService.listAllDocuments(req.user);
    return res.status(200).json({ documents });
  } catch (error) {
    return sendError(res, error, "Erro ao listar documentos");
  }
}

async function upload(req, res) {
  try {
    const document = await clientDocumentService.uploadDocument(
      req.user,
      req.query,
      req.body,
      req.query.originalName,
    );
    return res.status(201).json({ document });
  } catch (error) {
    return sendError(res, error, "Erro ao publicar documento");
  }
}

async function download(req, res) {
  try {
    const { buffer, file } = await clientDocumentService.downloadDocument(req.user, req.params.id);
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
    return sendError(res, error, "Erro ao baixar documento");
  }
}

module.exports = { listOwn, listAll, upload, download };
