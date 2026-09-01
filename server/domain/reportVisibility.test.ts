import assert from "node:assert/strict";
import test from "node:test";
import { reportFieldVisibility } from "./reportVisibility";

test("subject teacher report access excludes unrelated sensitive sections", () => {
  assert.deepEqual(reportFieldVisibility(["teacher"], "teacher_assignment"), {
    attendance: true,
    fees: false,
    health: false,
    library: false,
  });
});

test("linked family access can receive configured student report sections", () => {
  assert.deepEqual(reportFieldVisibility(["parent"], "linked_parent"), {
    attendance: true,
    fees: true,
    health: true,
    library: true,
  });
});

test("combined operational roles add only their assigned report sections", () => {
  assert.deepEqual(reportFieldVisibility(["teacher", "accountant", "librarian"], "teacher_assignment"), {
    attendance: true,
    fees: true,
    health: false,
    library: true,
  });
});
