const organizationRepository = require("../repositories/organization.repository");
const organizationService = require("../services/organization.services");

const { sendError } = require("../security/errors");

async function listOptions(_req, res) {
  try {
    return res.status(200).json(await organizationRepository.listOptions());
  } catch (error) {
    return sendError(res, error, "Erro ao listar grupos e cargos");
  }
}

async function listCoordinatorGroups(req, res) {
  try {
    const links = await organizationService.listCoordinatorGroups(req.params.id);
    return res.status(200).json({ groups: links.map(({ group }) => group) });
  } catch (error) {
    return sendError(res, error, "Erro ao listar grupos do coordenador");
  }
}

async function assignCoordinatorGroup(req, res) {
  try {
    const link = await organizationService.assignCoordinatorGroup(
      req.params.id,
      req.params.groupId,
      req.user,
    );
    return res.status(201).json({ group: link.group });
  } catch (error) {
    return sendError(res, error, "Erro ao vincular grupo");
  }
}

async function removeCoordinatorGroup(req, res) {
  try {
    await organizationService.removeCoordinatorGroup(
      req.params.id,
      req.params.groupId,
      req.user,
    );
    return res.status(204).send();
  } catch (error) {
    return sendError(res, error, "Erro ao remover vínculo");
  }
}

module.exports = {
  listOptions,
  listCoordinatorGroups,
  assignCoordinatorGroup,
  removeCoordinatorGroup,
};
