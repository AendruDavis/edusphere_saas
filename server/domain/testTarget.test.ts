import assert from "node:assert/strict";
import test from "node:test";
import { validateTestTarget } from "../testing/testTarget";

test("test harness rejects missing, production-like, and aliased application targets", () => {
  assert.throws(() => validateTestTarget(undefined, undefined, "18"), /required/);
  for (const name of ["edusphere", "postgres", "edusphere_test_prod", "contest"]) {
    assert.throws(() => validateTestTarget(`postgres://localhost/${name}`, undefined, "18"), /dedicated/);
  }
  assert.throws(() => validateTestTarget("postgres://localhost/edusphere_test_a", "postgres://127.0.0.1:5432/edusphere_test_a", "18"), /application database/);
  assert.throws(() => validateTestTarget("postgres://localhost/edusphere_test_a?options=x", undefined, "18"), /dedicated/);
  assert.throws(() => validateTestTarget("postgres://localhost/edusphere_test_a"), /TEST_POSTGRES_MAJOR/);
});

test("test harness accepts an explicitly isolated target", () => {
  const result = validateTestTarget("postgres://localhost/edusphere_test_config", "postgres://localhost/edusphere", "18");
  assert.equal(result.databaseName, "edusphere_test_config");
  assert.equal(result.major, 18);
});
