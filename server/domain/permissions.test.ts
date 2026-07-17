import assert from "node:assert/strict";
import test from "node:test";
import { canManageRole, roleCan } from "../../shared/permissions";

test("super admin can manage every role", () => {
  assert.equal(canManageRole("super_admin", "super_admin", "delete"), true);
  assert.equal(canManageRole("super_admin", "admin", "create"), true);
  assert.equal(canManageRole("super_admin", "nurse", "update"), true);
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
