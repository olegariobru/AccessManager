const prisma = require("../config/prisma");

async function audit({ actorId, action, entityType, entityId, changes }, tx = prisma) {
  return tx.auditLog.create({
    data: {
      actorId: actorId ? Number(actorId) : null,
      action,
      entityType,
      entityId: entityId == null ? null : String(entityId),
      changes,
    },
  });
}

module.exports = { audit };
