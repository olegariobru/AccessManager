const prisma = require("../config/prisma");

const include = {
  user: { select: { id: true, name: true, email: true } },
  publisher: { select: { id: true, name: true } },
  file: true,
};

function toPayslipDto(payslip) {
  if (!payslip) return null;
  return {
    ...payslip,
    file: payslip.file ? {
      id: payslip.file.id,
      originalName: payslip.file.originalName,
      mimeType: payslip.file.mimeType,
      sizeBytes: payslip.file.sizeBytes.toString(),
      createdAt: payslip.file.createdAt,
    } : null,
  };
}

async function list({ userId, status, groupIds } = {}) {
  const where = {
    ...(userId ? { userId: Number(userId) } : {}),
    ...(status ? { status } : {}),
    ...(groupIds ? {
      user: {
        memberships: { some: { groupId: { in: groupIds.map(Number) }, endsAt: null } },
      },
    } : {}),
  };
  const items = await prisma.payslip.findMany({
    where,
    include,
    orderBy: [{ year: "desc" }, { month: "desc" }],
  });
  return items.map(toPayslipDto);
}

async function upsert({
  userId,
  year,
  month,
  grossAmount,
  netAmount,
  file,
  publisherId,
  publish,
}) {
  return prisma.$transaction(async (tx) => {
    let fileAsset;
    if (file) {
      fileAsset = await tx.fileAsset.create({ data: file });
    }
    const payslip = await tx.payslip.upsert({
      where: { userId_year_month: { userId, year, month } },
      update: {
        grossAmount,
        netAmount,
        ...(fileAsset ? { fileId: fileAsset.id } : {}),
        ...(publish ? {
          status: "PUBLISHED",
          publishedById: publisherId,
          publishedAt: new Date(),
        } : {}),
      },
      create: {
        userId,
        year,
        month,
        grossAmount,
        netAmount,
        fileId: fileAsset?.id,
        status: publish ? "PUBLISHED" : "DRAFT",
        publishedById: publish ? publisherId : null,
        publishedAt: publish ? new Date() : null,
      },
      include,
    });
    return toPayslipDto(payslip);
  });
}

async function upsertWithFile({
  userId,
  year,
  month,
  grossAmount,
  netAmount,
  file,
  publisherId,
}) {
  return prisma.$transaction(async (tx) => {
    const current = await tx.payslip.findUnique({
      where: { userId_year_month: { userId, year, month } },
      include: { file: true },
    });
    const fileAsset = await tx.fileAsset.create({ data: file });
    const payslip = await tx.payslip.upsert({
      where: { userId_year_month: { userId, year, month } },
      update: {
        grossAmount,
        netAmount,
        fileId: fileAsset.id,
        status: "PUBLISHED",
        publishedById: publisherId,
        publishedAt: new Date(),
      },
      create: {
        userId,
        year,
        month,
        grossAmount,
        netAmount,
        fileId: fileAsset.id,
        status: "PUBLISHED",
        publishedById: publisherId,
        publishedAt: new Date(),
      },
      include,
    });
    if (current?.fileId) await tx.fileAsset.delete({ where: { id: current.fileId } });
    return {
      payslip: toPayslipDto(payslip),
      replacedStorageKey: current?.file?.storageKey || null,
    };
  });
}

async function findForDownload(id) {
  return prisma.payslip.findUnique({
    where: { id: Number(id) },
    include: { file: true },
  });
}

module.exports = { list, upsert, upsertWithFile, findForDownload };
