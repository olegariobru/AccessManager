const prisma = require("../config/prisma");

const include = {
  user: { select: { id: true, name: true, email: true } },
  publisher: { select: { id: true, name: true } },
  file: true,
};

function toDocumentDto(document) {
  if (!document) return null;
  return {
    id: document.id,
    userId: document.userId,
    type: document.type,
    title: document.title,
    taxYear: document.taxYear,
    referenceMonth: document.referenceMonth,
    dueDate: document.dueDate,
    amount: document.amount == null ? null : document.amount.toString(),
    digitableLine: document.digitableLine,
    status: document.status,
    publishedAt: document.publishedAt,
    createdAt: document.createdAt,
    updatedAt: document.updatedAt,
    user: document.user,
    publisher: document.publisher,
    file: document.file ? {
      id: document.file.id,
      originalName: document.file.originalName,
      mimeType: document.file.mimeType,
      sizeBytes: document.file.sizeBytes.toString(),
      createdAt: document.file.createdAt,
    } : null,
  };
}

async function list({ userId, status, type } = {}) {
  const documents = await prisma.clientDocument.findMany({
    where: {
      ...(userId ? { userId: Number(userId) } : {}),
      ...(status ? { status } : {}),
      ...(type ? { type } : {}),
    },
    include,
    orderBy: [{ publishedAt: "desc" }, { id: "desc" }],
  });
  return documents.map(toDocumentDto);
}

async function save({ document, file }) {
  return prisma.$transaction(async (tx) => {
    const current = document.type === "IRPF"
      ? await tx.clientDocument.findFirst({
        where: {
          userId: document.userId,
          type: "IRPF",
          taxYear: document.taxYear,
          status: "PUBLISHED",
        },
        include: { file: true },
      })
      : null;
    const fileAsset = await tx.fileAsset.create({ data: file });
    let stored;

    if (current) {
      stored = await tx.clientDocument.update({
        where: { id: current.id },
        data: {
          ...document,
          fileId: fileAsset.id,
          publishedAt: new Date(),
        },
        include,
      });
      await tx.fileAsset.delete({ where: { id: current.fileId } });
    } else {
      stored = await tx.clientDocument.create({
        data: { ...document, fileId: fileAsset.id },
        include,
      });
    }

    return {
      document: toDocumentDto(stored),
      replacedStorageKey: current?.file?.storageKey || null,
    };
  });
}

async function findForDownload(id) {
  return prisma.clientDocument.findUnique({
    where: { id: Number(id) },
    include: { file: true },
  });
}

module.exports = { list, save, findForDownload, toDocumentDto };
