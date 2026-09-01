import assert from "node:assert/strict";
import test from "node:test";
import { serializeSchoolSettingsValue } from "../infrastructure/postgresRepository";

test("school settings encode JSON arrays and objects before database writes", () => {
  assert.equal(serializeSchoolSettingsValue("classes", ["P.1", "P.2"]), '["P.1","P.2"]');
  assert.equal(serializeSchoolSettingsValue("gradingScale", [{ min: 80, grade: "D1" }]), '[{"min":80,"grade":"D1"}]');
  assert.equal(serializeSchoolSettingsValue("reportSettings", { preset: "classic" }), '{"preset":"classic"}');
});

test("school settings leave scalar columns unchanged", () => {
  assert.equal(serializeSchoolSettingsValue("name", "EduSphere Academy"), "EduSphere Academy");
});
