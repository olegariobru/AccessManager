-- Documentos privados disponibilizados no portal Cliente.
CREATE TYPE "ClientDocumentType" AS ENUM ('IRPF', 'ITAU_BANK_SLIP');
CREATE TYPE "ClientDocumentStatus" AS ENUM ('PUBLISHED', 'ARCHIVED');

CREATE TABLE "client_documents" (
  "id" SERIAL NOT NULL,
  "userId" INTEGER NOT NULL,
  "type" "ClientDocumentType" NOT NULL,
  "title" VARCHAR(160) NOT NULL,
  "taxYear" INTEGER,
  "referenceMonth" INTEGER,
  "dueDate" DATE,
  "amount" DECIMAL(12,2),
  "digitableLine" VARCHAR(64),
  "status" "ClientDocumentStatus" NOT NULL DEFAULT 'PUBLISHED',
  "fileId" UUID NOT NULL,
  "publishedById" INTEGER,
  "publishedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "client_documents_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "client_documents_tax_year_check" CHECK ("taxYear" IS NULL OR "taxYear" BETWEEN 2000 AND 2200),
  CONSTRAINT "client_documents_reference_month_check" CHECK ("referenceMonth" IS NULL OR "referenceMonth" BETWEEN 1 AND 12),
  CONSTRAINT "client_documents_amount_check" CHECK ("amount" IS NULL OR "amount" >= 0),
  CONSTRAINT "client_documents_irpf_year_check" CHECK ("type" <> 'IRPF' OR "taxYear" IS NOT NULL),
  CONSTRAINT "client_documents_boleto_due_date_check" CHECK ("type" <> 'ITAU_BANK_SLIP' OR "dueDate" IS NOT NULL)
);

CREATE UNIQUE INDEX "client_documents_fileId_key" ON "client_documents"("fileId");
CREATE UNIQUE INDEX "client_documents_irpf_user_year_key"
  ON "client_documents"("userId", "taxYear")
  WHERE "type" = 'IRPF' AND "status" = 'PUBLISHED';
CREATE INDEX "client_documents_userId_type_status_idx" ON "client_documents"("userId", "type", "status");
CREATE INDEX "client_documents_type_taxYear_referenceMonth_idx" ON "client_documents"("type", "taxYear", "referenceMonth");
CREATE INDEX "client_documents_dueDate_status_idx" ON "client_documents"("dueDate", "status");

ALTER TABLE "client_documents" ADD CONSTRAINT "client_documents_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "client_documents" ADD CONSTRAINT "client_documents_fileId_fkey"
  FOREIGN KEY ("fileId") REFERENCES "file_assets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "client_documents" ADD CONSTRAINT "client_documents_publishedById_fkey"
  FOREIGN KEY ("publishedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
