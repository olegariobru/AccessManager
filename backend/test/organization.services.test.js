const test = require("node:test");
const assert = require("node:assert/strict");
const organizationRepository = require("../src/repositories/organization.repository");
const userRepository = require("../src/repositories/user.repository");
const securityRepository = require("../src/repositories/security.repository");
const organizationService = require("../src/services/organization.services");

test("somente coordenador pode receber grupo e vínculo duplicado é rejeitado", async (t) => {
  const originals = {
    user: userRepository.findById,
    group: organizationRepository.findGroup,
    assign: organizationRepository.assignCoordinatorGroup,
    audit: securityRepository.audit,
  };
  t.after(() => {
    userRepository.findById = originals.user;
    organizationRepository.findGroup = originals.group;
    organizationRepository.assignCoordinatorGroup = originals.assign;
    securityRepository.audit = originals.audit;
  });
  securityRepository.audit = async () => {};
  organizationRepository.findGroup = async () => ({ id: 4, isActive: true });

  userRepository.findById = async () => ({ id: 2, roles: ["USER"] });
  await assert.rejects(
    () => organizationService.assignCoordinatorGroup(2, 4, { id: 1 }),
    (error) => error.statusCode === 400,
  );

  userRepository.findById = async () => ({ id: 2, roles: ["COORDINATOR"] });
  organizationRepository.assignCoordinatorGroup = async () => {
    const error = new Error("Unique constraint");
    error.code = "P2002";
    throw error;
  };
  await assert.rejects(
    () => organizationService.assignCoordinatorGroup(2, 4, { id: 1 }),
    (error) => error.statusCode === 409,
  );
});
