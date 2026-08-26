ALTER TYPE "RoleCode" ADD VALUE IF NOT EXISTS 'CLIENT';

CREATE TABLE "client_profiles" (
  "id" SERIAL NOT NULL,
  "userId" INTEGER NOT NULL,
  "fullName" VARCHAR(150) NOT NULL,
  "cpf" CHAR(11) NOT NULL,
  "phone" VARCHAR(13) NOT NULL,
  "birthDate" DATE,
  "createdById" INTEGER,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "client_profiles_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "client_profiles_cpf_check" CHECK ("cpf" ~ '^[0-9]{11}$'),
  CONSTRAINT "client_profiles_phone_check" CHECK ("phone" ~ '^[0-9]{10,13}$')
);

CREATE UNIQUE INDEX "client_profiles_userId_key" ON "client_profiles"("userId");
CREATE UNIQUE INDEX "client_profiles_cpf_key" ON "client_profiles"("cpf");
CREATE INDEX "client_profiles_fullName_idx" ON "client_profiles"("fullName");
CREATE INDEX "client_profiles_createdById_idx" ON "client_profiles"("createdById");

ALTER TABLE "client_profiles" ADD CONSTRAINT "client_profiles_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "client_profiles" ADD CONSTRAINT "client_profiles_createdById_fkey"
  FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
