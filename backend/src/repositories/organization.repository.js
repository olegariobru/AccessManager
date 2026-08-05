const prisma = require("../config/prisma");

async function listOptions() {
  const [groups, positions, roles] = await Promise.all([
    prisma.group.findMany({
      where: { isActive: true },
      select: { id: true, name: true, slug: true },
      orderBy: { name: "asc" },
    }),
    prisma.position.findMany({
      where: { isActive: true },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    prisma.role.findMany({
      select: { id: true, code: true, description: true },
      orderBy: { id: "asc" },
    }),
  ]);
  return { groups, positions, roles };
}

async function findGroup(groupId) {
  return prisma.group.findFirst({ where: { id: Number(groupId), isActive: true } });
}

async function organizationIsActive(groupId, positionId) {
  const [groups, positions] = await Promise.all([
    prisma.group.count({ where: { id: Number(groupId), isActive: true } }),
    prisma.position.count({ where: { id: Number(positionId), isActive: true } }),
  ]);
  return groups === 1 && positions === 1;
}

async function coordinatorHasGroup(userId, groupId) {
  const total = await prisma.groupCoordinator.count({
    where: { userId: Number(userId), groupId: Number(groupId), group: { isActive: true } },
  });
  return total > 0;
}

async function listCoordinatorGroups(userId) {
  return prisma.groupCoordinator.findMany({
    where: { userId: Number(userId) },
    include: { group: true },
    orderBy: { group: { name: "asc" } },
  });
}

async function assignCoordinatorGroup(userId, groupId) {
  return prisma.groupCoordinator.create({
    data: { userId: Number(userId), groupId: Number(groupId) },
    include: { group: true },
  });
}

async function removeCoordinatorGroup(userId, groupId) {
  return prisma.groupCoordinator.delete({
    where: {
      userId_groupId: { userId: Number(userId), groupId: Number(groupId) },
    },
  });
}

module.exports = {
  listOptions,
  findGroup,
  organizationIsActive,
  coordinatorHasGroup,
  listCoordinatorGroups,
  assignCoordinatorGroup,
  removeCoordinatorGroup,
};
