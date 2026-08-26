INSERT INTO "roles" ("code", "description")
VALUES ('CLIENT', 'Cliente com acesso somente aos próprios documentos')
ON CONFLICT ("code") DO UPDATE SET "description" = EXCLUDED."description";
