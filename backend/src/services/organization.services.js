const organizationRepository = require("../repositories/organization.repository");
const userRepository = require("../repositories/user.repository");
const securityRepository = require("../repositories/security.repository");

function httpError(message, statusCode) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

async function listCoordinatorGroups(userId) {
  const user = await userRepository.findById(userId);
  if (!user || !user.roles.includes("COORDINATOR")) {
    throw httpError("Usuário não é coordenador", 400);
  }
  return organizationRepository.listCoordinatorGroups(userId);
}

async function assignCoordinatorGroup(userId, groupId, actor) {
  const user = await userRepository.findById(userId);
  const group = await organizationRepository.findGroup(groupId);
  if (!user || !user.roles.includes("COORDINATOR")) {
    throw httpError("Usuário não é coordenador", 400);
  }
  if (!group) throw httpError("Grupo não encontrado ou inativo", 404);

  try {
    const link = await organizationRepository.assignCoordinatorGroup(userId, groupId);
    await securityRepository.audit({
      actorId: actor.id,
      action: "COORDINATOR_GROUP_ASSIGNED",
      entityType: "GroupCoordinator",
      entityId: `${userId}:${groupId}`,
      changes: { userId: Number(userId), groupId: Number(groupId) },
    });
    return link;
  } catch (error) {
    if (error.code === "P2002") throw httpError("Coordenador já vinculado a este grupo", 409);
    throw error;
  }
}

async function removeCoordinatorGroup(userId, groupId, actor) {
  if (!await organizationRepository.coordinatorHasGroup(userId, groupId)) {
    throw httpError("Vínculo não encontrado", 404);
  }
  await organizationRepository.removeCoordinatorGroup(userId, groupId);
  await securityRepository.audit({
    actorId: actor.id,
    action: "COORDINATOR_GROUP_REMOVED",
    entityType: "GroupCoordinator",
    entityId: `${userId}:${groupId}`,
    changes: { userId: Number(userId), groupId: Number(groupId) },
  });
}

module.exports = {
  listCoordinatorGroups,
  assignCoordinatorGroup,
  removeCoordinatorGroup,
};
