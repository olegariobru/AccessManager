const prisma = require("../config/prisma");

const accessInclude = {
  roles: { include: { role: true } },
  memberships: {
    where: { endsAt: null },
    include: { group: true, position: true },
    orderBy: [{ isPrimary: "desc" }, { startsAt: "desc" }],
    take: 1,
  },
  coordinatedGroups: {
    include: { group: true },
  },
};

function primaryRole(roleCodes = []) {
  if (roleCodes.includes("ADMIN")) return "ADMIN";
  if (roleCodes.includes("COORDINATOR")) return "COORDINATOR";
  return "USER";
}

function isHumanResourcesGroup(group) {
  const name = String(group?.name || "").trim().toUpperCase();
  const slug = String(group?.slug || "").trim().toLowerCase();
  return name === "RH" || slug === "rh" || /^rh-[a-f0-9]{8}$/.test(slug);
}

function toPublicUser(user) {
  if (!user) return null;
  const roleCodes = (user.roles || []).map(({ role }) => role.code);
  const membership = user.memberships?.[0];
  const { passwordHash: _passwordHash, roles: _roles, memberships: _memberships, coordinatedGroups, ...identity } = user;
  const managedGroups = coordinatedGroups || [];
  const isHr = isHumanResourcesGroup(membership?.group)
    || managedGroups.some(({ group }) => isHumanResourcesGroup(group));

  return {
    ...identity,
    role: primaryRole(roleCodes),
    roles: roleCodes,
    isMaster: roleCodes.includes("ADMIN"),
    group: membership?.group || null,
    position: membership?.position || null,
    isHr,
    groupIds: managedGroups.map(({ groupId }) => groupId),
    accessibleGroups: managedGroups.map(({ group }) => group),
    grupo: membership?.group?.name || null,
    cargo: membership?.position?.name || null,
  };
}

async function withMasterGroupScope(user, database = prisma) {
  if (!user || user.role !== "ADMIN") return user;
  const groups = await database.group.findMany({
    where: { isActive: true },
    select: { id: true, name: true, slug: true },
    orderBy: [{ name: "asc" }, { id: "asc" }],
  });
  return {
    ...user,
    isMaster: true,
    groupIds: groups.map(({ id }) => id),
    accessibleGroups: groups,
  };
}

async function findByEmail(email) {
  return prisma.user.findFirst({
    where: { email: { equals: email, mode: "insensitive" } },
    include: accessInclude,
  });
}

async function findById(id) {
  const user = await prisma.user.findFirst({
    where: { id: Number(id), deletedAt: null },
    include: accessInclude,
  });
  return withMasterGroupScope(toPublicUser(user));
}

async function getAccessContext(id) {
  const user = await prisma.user.findFirst({
    where: { id: Number(id), deletedAt: null, status: "ACTIVE" },
    include: accessInclude,
  });
  if (!user?.roles?.length) return null;
  return withMasterGroupScope(toPublicUser(user));
}

async function assertOrganization(tx, groupId, positionId, roleCodes) {
  const [group, position, roles] = await Promise.all([
    tx.group.findFirst({ where: { id: groupId, isActive: true } }),
    tx.position.findFirst({ where: { id: positionId, isActive: true } }),
    tx.role.findMany({ where: { code: { in: roleCodes } } }),
  ]);

  if (!group || !position || roles.length !== roleCodes.length) {
    const error = new Error("Grupo, cargo ou perfil inválido");
    error.statusCode = 400;
    error.code = "INVALID_ORGANIZATION";
    throw error;
  }
  return { group, position, roles };
}

async function createWithAccess({
  name,
  email,
  passwordHash,
  status = "ACTIVE",
  roleCodes = ["USER"],
  groupId,
  positionId,
}, transaction = prisma) {
  const operation = async (tx) => {
    const { roles } = await assertOrganization(tx, groupId, positionId, roleCodes);
    const user = await tx.user.create({
      data: {
        name,
        email,
        passwordHash,
        status,
        roles: {
          create: roles.map(({ id }) => ({ roleId: id })),
        },
        memberships: {
          create: { groupId, positionId, isPrimary: true },
        },
      },
      include: accessInclude,
    });

    if (roleCodes.includes("COORDINATOR")) {
      await tx.groupCoordinator.create({ data: { userId: user.id, groupId } });
      user.coordinatedGroups = [{ userId: user.id, groupId, group: user.memberships[0].group }];
    }
    return withMasterGroupScope(toPublicUser(user), tx);
  };

  return transaction === prisma ? prisma.$transaction(operation) : operation(transaction);
}

async function findAll(search = "") {
  const where = {
    deletedAt: null,
    status: "ACTIVE",
    ...(search ? {
      OR: [
        { name: { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } },
      ],
    } : {}),
  };

  const rows = await prisma.user.findMany({
    where,
    include: accessInclude,
    orderBy: [{ name: "asc" }, { id: "asc" }],
  });
  const publicUsers = rows.map(toPublicUser);
  const hasAdministrator = publicUsers.some(({ role }) => role === "ADMIN");
  if (!hasAdministrator) return publicUsers;
  const groups = await prisma.group.findMany({
    where: { isActive: true },
    select: { id: true, name: true, slug: true },
    orderBy: [{ name: "asc" }, { id: "asc" }],
  });
  return publicUsers.map((user) => user.role === "ADMIN" ? {
    ...user,
    isMaster: true,
    groupIds: groups.map(({ id }) => id),
    accessibleGroups: groups,
  } : user);
}

async function updateAccess(id, { roleCode, groupId, positionId }) {
  return prisma.$transaction(async (tx) => {
    const userId = Number(id);
    const current = await tx.user.findFirst({ where: { id: userId, deletedAt: null } });
    if (!current) return null;

    const { roles } = await assertOrganization(tx, groupId, positionId, [roleCode]);
    const currentMembership = await tx.userMembership.findFirst({
      where: { userId, endsAt: null, isPrimary: true },
    });

    await tx.userRole.deleteMany({ where: { userId } });
    await tx.userRole.create({ data: { userId, roleId: roles[0].id } });

    if (
      !currentMembership
      || currentMembership.groupId !== groupId
      || currentMembership.positionId !== positionId
    ) {
      await tx.userMembership.updateMany({
        where: { userId, endsAt: null },
        data: { endsAt: new Date(), isPrimary: false },
      });
      await tx.userMembership.create({
        data: { userId, groupId, positionId, isPrimary: true },
      });
    }

    if (roleCode === "COORDINATOR") {
      await tx.groupCoordinator.deleteMany({
        where: { userId, groupId: { not: groupId } },
      });
      await tx.groupCoordinator.upsert({
        where: { userId_groupId: { userId, groupId } },
        update: {},
        create: { userId, groupId },
      });
    } else {
      await tx.groupCoordinator.deleteMany({ where: { userId } });
    }

    const updated = await tx.user.findUnique({ where: { id: userId }, include: accessInclude });
    return withMasterGroupScope(toPublicUser(updated), tx);
  });
}

async function deactivate(id) {
  return prisma.$transaction(async (tx) => {
    const userId = Number(id);
    const user = await tx.user.update({
      where: { id: userId },
      data: { status: "INACTIVE", deletedAt: new Date() },
      include: accessInclude,
    });
    await tx.userMembership.updateMany({
      where: { userId, endsAt: null },
      data: { endsAt: new Date(), isPrimary: false },
    });
    await tx.groupCoordinator.deleteMany({ where: { userId } });
    return toPublicUser(user);
  });
}

async function changePassword(id, passwordHash) {
  return prisma.user.update({
    where: { id: Number(id) },
    data: { passwordHash, mustChangePassword: false, tokenVersion: { increment: 1 } },
    select: { id: true, tokenVersion: true },
  });
}

module.exports = {
  createWithAccess,
  findByEmail,
  findById,
  findAll,
  getAccessContext,
  updateAccess,
  deactivate,
  changePassword,
  toPublicUser,
  accessInclude,
  isHumanResourcesGroup,
  withMasterGroupScope,
};
