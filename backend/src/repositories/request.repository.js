const securityRepository = require("./security.repository");
const prisma = require("../config/prisma");

const requestInclude = {
  user: { select: { id: true, name: true, email: true } },
  group: { select: { id: true, name: true } },
  reviewer: { select: { id: true, name: true } },
  scheduler: { select: { id: true, name: true } },
};

function toRequestDto(request) {
  if (!request) return null;
  return {
    id: request.id,
    type: "VACATION",
    status: request.status,
    startDate: request.startDate,
    endDate: request.endDate,
    days: request.days,
    notes: request.notes,
    createdAt: request.createdAt,
    updatedAt: request.updatedAt,
    reviewedAt: request.reviewedAt,
    scheduledAt: request.scheduledAt,
    userId: request.userId,
    userName: request.user?.name,
    userEmail: request.user?.email,
    groupId: request.groupId,
    userGroup: request.group?.name,
    reviewerName: request.reviewer?.name,
    scheduledByName: request.scheduler?.name,
  };
}

async function createVacation({ userId, startDate, endDate, days, notes, initialStatus = "PENDING", auditEvent }) {
  return prisma.$transaction(async (tx) => {
    const membership = await tx.userMembership.findFirst({
      where: { userId: Number(userId), endsAt: null, isPrimary: true },
      include: { group: true },
    });
    if (!membership?.group.isActive) {
      const error = new Error("Usuário não possui vínculo organizacional ativo");
      error.statusCode = 409;
      throw error;
    }

    const overlap = await tx.vacationRequest.findFirst({
      where: {
        userId: Number(userId),
        status: { in: ["PENDING", "PENDING_HR", "APPROVED"] },
        startDate: { lte: endDate },
        endDate: { gte: startDate },
      },
      select: { id: true },
    });
    if (overlap) {
      const error = new Error("Já existe uma solicitação de férias neste período");
      error.statusCode = 409;
      error.code = "VACATION_OVERLAP";
      throw error;
    }

    const request = await tx.vacationRequest.create({
      data: {
        userId: Number(userId),
        groupId: membership.groupId,
        startDate,
        endDate,
        days,
        notes,
        status: initialStatus,
        history: {
          create: { toStatus: initialStatus, changedById: Number(userId) },
        },
      },
      include: requestInclude,
    });
    if (auditEvent) await securityRepository.audit({ ...auditEvent, entityId: request.id }, tx);
    return toRequestDto(request);
  }, { isolationLevel: "Serializable" });
}

async function findById(id) {
  const request = await prisma.vacationRequest.findUnique({
    where: { id: Number(id) },
    include: requestInclude,
  });
  return toRequestDto(request);
}

async function list({ userId, groupIds, statuses }) {
  const where = {
    ...(userId ? { userId: Number(userId) } : {}),
    ...(groupIds ? { groupId: { in: groupIds.map(Number) } } : {}),
    ...(statuses ? { status: { in: statuses } } : {}),
  };

  const items = await prisma.vacationRequest.findMany({
    where,
    include: requestInclude,
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
  });
  return items.map(toRequestDto);
}

async function updateStatus({ id, status, reviewerId, reason, auditEvent }) {
  return prisma.$transaction(async (tx) => {
    const current = await tx.vacationRequest.findUnique({ where: { id: Number(id) } });
    if (!current) return null;
    if (current.status !== "PENDING") {
      const error = new Error("Esta solicitação já foi analisada");
      error.statusCode = 409;
      error.code = "INVALID_STATUS_TRANSITION";
      throw error;
    }

    const request = await tx.vacationRequest.update({
      where: { id: Number(id), status: current.status },
      data: {
        status,
        reviewedById: Number(reviewerId),
        reviewedAt: new Date(),
        history: {
          create: {
            fromStatus: current.status,
            toStatus: status,
            changedById: Number(reviewerId),
            reason,
          },
        },
      },
      include: requestInclude,
    });
    if (auditEvent) await securityRepository.audit({ ...auditEvent, entityId: request.id }, tx);
    return toRequestDto(request);
  });
}

async function markAsScheduled({ id, schedulerId, reason, auditEvent }) {
  return prisma.$transaction(async (tx) => {
    const current = await tx.vacationRequest.findUnique({ where: { id: Number(id) } });
    if (!current) return null;
    if (current.status !== "PENDING_HR") {
      const error = new Error("Somente férias aguardando o RH podem ser marcadas");
      error.statusCode = 409;
      error.code = "INVALID_STATUS_TRANSITION";
      throw error;
    }

    const request = await tx.vacationRequest.update({
      where: { id: Number(id), status: "PENDING_HR" },
      data: {
        status: "APPROVED",
        scheduledById: Number(schedulerId),
        scheduledAt: new Date(),
        history: {
          create: {
            fromStatus: current.status,
            toStatus: "APPROVED",
            changedById: Number(schedulerId),
            reason,
          },
        },
      },
      include: requestInclude,
    });
    if (auditEvent) await securityRepository.audit({ ...auditEvent, entityId: request.id }, tx);
    return toRequestDto(request);
  });
}

async function decideByHr({ id, status, schedulerId, reason, auditEvent }) {
  return prisma.$transaction(async (tx) => {
    const current = await tx.vacationRequest.findUnique({ where: { id: Number(id) } });
    if (!current) return null;
    if (current.status !== "PENDING_HR") {
      const error = new Error("Somente férias aguardando o RH podem ser decididas");
      error.statusCode = 409;
      error.code = "INVALID_STATUS_TRANSITION";
      throw error;
    }
    const approved = status === "APPROVED";
    const request = await tx.vacationRequest.update({
      where: { id: Number(id), status: current.status },
      data: {
        status,
        scheduledById: Number(schedulerId),
        scheduledAt: approved ? new Date() : null,
        history: { create: { fromStatus: current.status, toStatus: status, changedById: Number(schedulerId), reason } },
      },
      include: requestInclude,
    });
    if (auditEvent) await securityRepository.audit({ ...auditEvent, entityId: request.id }, tx);
    return toRequestDto(request);
  });
}

async function cancel({ id, userId, reason, auditEvent }) {
  return prisma.$transaction(async (tx) => {
    const current = await tx.vacationRequest.findFirst({
      where: { id: Number(id), userId: Number(userId) },
    });
    if (!current) return null;
    if (current.status !== "PENDING") {
      const error = new Error("Somente solicitações pendentes podem ser canceladas");
      error.statusCode = 409;
      throw error;
    }
    const request = await tx.vacationRequest.update({
      where: { id: current.id, status: "PENDING", userId: Number(userId) },
      data: {
        status: "CANCELLED",
        cancelledAt: new Date(),
        history: {
          create: {
            fromStatus: current.status,
            toStatus: "CANCELLED",
            changedById: Number(userId),
            reason,
          },
        },
      },
      include: requestInclude,
    });
    if (auditEvent) await securityRepository.audit({ ...auditEvent, entityId: request.id }, tx);
    return toRequestDto(request);
  });
}

module.exports = {
  createVacation,
  findById,
  list,
  updateStatus,
  markAsScheduled,
  decideByHr,
  cancel,
  toRequestDto,
};
