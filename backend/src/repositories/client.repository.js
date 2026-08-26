const prisma = require("../config/prisma");

const clientInclude = {
  user: {
    select: {
      id: true,
      email: true,
      status: true,
      deletedAt: true,
      mustChangePassword: true,
    },
  },
};

function maskCpf(cpf) {
  const digits = String(cpf || "").replace(/\D/g, "");
  return digits.length === 11 ? `***.***.***-${digits.slice(-2)}` : "***.***.***-**";
}

function formatPhone(phone) {
  const digits = String(phone || "").replace(/\D/g, "");
  if (digits.length === 11) return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
  if (digits.length === 10) return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  return digits;
}

function toClientDto(profile, { includePersonalData = false } = {}) {
  if (!profile) return null;
  const dto = {
    id: profile.id,
    userId: profile.userId,
    fullName: profile.fullName,
    email: profile.user.email,
    cpfMasked: maskCpf(profile.cpf),
    birthDate: profile.birthDate?.toISOString().slice(0, 10) || null,
    status: profile.user.status,
    mustChangePassword: profile.user.mustChangePassword,
    createdAt: profile.createdAt,
  };
  if (includePersonalData) dto.phone = formatPhone(profile.phone);
  return dto;
}

async function list({ includePersonalData = false } = {}) {
  const profiles = await prisma.clientProfile.findMany({
    where: {
      user: { deletedAt: null, status: "ACTIVE" },
    },
    include: clientInclude,
    orderBy: [{ fullName: "asc" }, { id: "asc" }],
  });
  return profiles.map((profile) => toClientDto(profile, { includePersonalData }));
}

async function findByCpf(cpf) {
  return prisma.clientProfile.findUnique({ where: { cpf } });
}

async function findActiveByUserId(userId) {
  return prisma.clientProfile.findFirst({
    where: {
      userId: Number(userId),
      user: { deletedAt: null, status: "ACTIVE" },
    },
    select: { id: true, userId: true, fullName: true },
  });
}

async function createWithAccount({
  fullName,
  email,
  passwordHash,
  cpf,
  phone,
  birthDate,
  createdById,
}) {
  return prisma.$transaction(async (tx) => {
    const clientRole = await tx.role.findUnique({ where: { code: "CLIENT" } });
    if (!clientRole) {
      const error = new Error("Perfil CLIENT não configurado no banco de dados");
      error.statusCode = 500;
      error.code = "CLIENT_ROLE_NOT_CONFIGURED";
      throw error;
    }

    const user = await tx.user.create({
      data: {
        name: fullName,
        email,
        passwordHash,
        status: "ACTIVE",
        mustChangePassword: true,
        roles: { create: { roleId: clientRole.id } },
      },
    });
    const profile = await tx.clientProfile.create({
      data: {
        userId: user.id,
        fullName,
        cpf,
        phone,
        birthDate,
        createdById,
      },
      include: clientInclude,
    });
    return toClientDto(profile, { includePersonalData: true });
  });
}

module.exports = {
  createWithAccount,
  findActiveByUserId,
  findByCpf,
  formatPhone,
  list,
  maskCpf,
  toClientDto,
};
