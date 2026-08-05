-- Execute after the expand migration and compare every result with zero.
SELECT
  (SELECT COUNT(*) FROM "User") -
  (SELECT COUNT(DISTINCT "userId") FROM "user_roles") AS users_without_role;

SELECT
  (SELECT COUNT(*) FROM "User" WHERE "deletedAt" IS NULL) -
  (SELECT COUNT(DISTINCT "userId") FROM "user_memberships" WHERE "endsAt" IS NULL)
  AS users_without_active_membership;

SELECT COUNT(*) AS vacations_not_migrated
FROM "EmployeeRequest" er
WHERE er."type" = 'VACATION'
  AND er."startDate" IS NOT NULL
  AND er."endDate" IS NOT NULL
  AND NOT EXISTS (
    SELECT 1
    FROM "vacation_requests" vr
    WHERE vr."userId" = er."userId"
      AND vr."startDate" = er."startDate"
      AND vr."endDate" = er."endDate"
      AND vr."createdAt" = er."createdAt"
  );

SELECT "email", COUNT(*)
FROM "User"
GROUP BY LOWER("email"), "email"
HAVING COUNT(*) > 1;
