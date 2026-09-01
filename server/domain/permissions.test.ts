import assert from "node:assert/strict";
import test from "node:test";
import { canManageRole, primarySchoolRole, roleCan, rolesCan } from "../../shared/permissions";

test("platform super admin can manage role assignments", () => {
  assert.equal(canManageRole("super_admin", "super_admin", "delete"), true);
  assert.equal(canManageRole("super_admin", "admin", "create"), true);
  assert.equal(canManageRole("super_admin", "nurse", "update"), true);
});

test("platform authority is not implicit school module access", () => {
  assert.equal(roleCan("super_admin", "settings", "read"), false);
  assert.equal(roleCan("super_admin", "students", "read"), false);
});

test("admin cannot create or remove privileged admin roles", () => {
  assert.equal(canManageRole("admin", "teacher", "create"), true);
  assert.equal(canManageRole("admin", "super_admin", "create"), false);
  assert.equal(canManageRole("admin", "super_admin", "update"), false);
  assert.equal(canManageRole("admin", "admin", "delete"), false);
});

test("module permissions keep sensitive features scoped", () => {
  assert.equal(roleCan("nurse", "sickBay", "create"), true);
  assert.equal(roleCan("teacher", "sickBay", "create"), false);
  assert.equal(roleCan("accountant", "fees", "create"), true);
  assert.equal(roleCan("parent", "fees", "create"), false);
});

test("multiple school roles combine capabilities without changing role priority", () => {
  const roles = ["teacher", "accountant"] as const;
  assert.equal(rolesCan(roles, "grades", "update"), true);
  assert.equal(rolesCan(roles, "finance", "create"), true);
  assert.equal(rolesCan(roles, "settings", "read"), false);
  assert.equal(primarySchoolRole([...roles]), "teacher");
});
