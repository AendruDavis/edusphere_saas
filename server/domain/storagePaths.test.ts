import assert from "node:assert/strict";
import test from "node:test";
import { sanitizeUploadFolder } from "../infrastructure/storageService";

test("upload folders cannot retain traversal or absolute path segments", () => {
  assert.equal(sanitizeUploadFolder("../../outside"), "outside");
  assert.equal(sanitizeUploadFolder("/branding/../school"), "branding/school");
  assert.equal(sanitizeUploadFolder("C:\\temp\\logos"), "C/temp/logos");
});

test("upload folders retain simple nested organization", () => {
  assert.equal(sanitizeUploadFolder("student-photos/2026"), "student-photos/2026");
  assert.equal(sanitizeUploadFolder(""), "general");
});
