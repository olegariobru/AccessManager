const prisma = require("../config/prisma");
const securityRepository = require("./security.repository");

function findPendingByUserId(userId) {
  return prisma.passwordResetRequest.findFirst({
    where: { userId, status: "PENDING", expiresAt: { gt: new Date() } },
    orderBy: { requestedAt: "desc" },
  });
}

function create({ userId, requesterIp, expiresAt }) {
  return prisma.passwordResetRequest.create({
    data: { userId, requesterIp: requesterIp || null, expiresAt },
  });
}

function markNotificationSent(id) {
  return prisma.passwordResetRequest.update({
    where: { id },
    data: { notificationSentAt: new Date() },
  });
}

function findActiveAdministrators() {
  return prisma.user.findMany({
    where: {
      status: "ACTIVE",
      deletedAt: null,
      roles: { some: { role: { code: "ADMIN" } } },
    },
    select: { id: true, name: true, email: true },
  });
}

function listPending() {
  return prisma.passwordResetRequest.findMany({
    where: { status: "PENDING", expiresAt: { gt: new Date() } },
    include: { user: { select: { id: true, name: true, email: true } } },
    orderBy: { requestedAt: "desc" },
  });
}

function resetPasswordByAdmin({ userId, requestId, passwordHash, administratorId }) {
  return prisma.$transaction(async (tx) => {
    const user = await tx.user.findFirst({
      where: { id: Number(userId), status: "ACTIVE", deletedAt: null },
      select: { id: true, name: true, email: true },
    });
    if (!user) return null;
    await tx.user.update({
      where: { id: user.id },
      data: { passwordHash, mustChangePassword: true, tokenVersion: { increment: 1 } },
    });
    const completedAt = new Date();
    if (requestId) {
      await tx.passwordResetRequest.updateMany({
        where: { id: requestId, userId: user.id, status: "PENDING" },
        data: { status: "COMPLETED", reviewedById: administratorId, reviewedAt: completedAt, completedAt },
      });
    }
    await tx.passwordResetRequest.updateMany({
      where: { userId: user.id, status: "PENDING", ...(requestId ? { id: { not: requestId } } : {}) },
      data: { status: "REJECTED", reviewedById: administratorId, reviewedAt: completedAt },
    });
    await securityRepository.audit({
      actorId: administratorId,
      action: "PASSWORD_RESET_BY_ADMIN",
      entityType: "User",
      entityId: user.id,
      changes: { requestId: requestId || null, sessionsInvalidated: true },
    }, tx);
    return user;
  });
}

module.exports = {
  create,
  findActiveAdministrators,
  findPendingByUserId,
  markNotificationSent,
  listPending,
  resetPasswordByAdmin,
};
