import assert from "node:assert/strict";
import test from "node:test";
import { DEFAULT_REPORT_SETTINGS, normalizeReportSettings } from "../../shared/reportSettings";

test("report settings use conservative defaults for invalid input", () => {
  assert.deepEqual(normalizeReportSettings(null), DEFAULT_REPORT_SETTINGS);
  assert.equal(normalizeReportSettings({ preset: "unknown" }).preset, "classic");
});

test("report settings preserve explicit section visibility and bound labels", () => {
  const normalized = normalizeReportSettings({
    preset: "compact",
    showFees: true,
    showHealth: true,
    showAttendance: false,
    title: "T".repeat(200),
    classTeacherLabel: "Class mentor",
  });

  assert.equal(normalized.preset, "compact");
  assert.equal(normalized.showFees, true);
  assert.equal(normalized.showHealth, true);
  assert.equal(normalized.showAttendance, false);
  assert.equal(normalized.title.length, 120);
  assert.equal(normalized.classTeacherLabel, "Class mentor");
  assert.equal(normalized.headTeacherLabel, DEFAULT_REPORT_SETTINGS.headTeacherLabel);
});
