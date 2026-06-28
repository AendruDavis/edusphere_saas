import assert from "node:assert/strict";
import test from "node:test";
import { AppError } from "./errors";
import { calculateAssessment, type AssessmentPolicy } from "./assessmentPolicy";

const gradeBands = [
  { min: 80, grade: "A", comment: "Exceptional" },
  { min: 70, grade: "B", comment: "Outstanding" },
  { min: 60, grade: "C", comment: "Satisfactory" },
  { min: 50, grade: "D", comment: "Basic" },
  { min: 0, grade: "E", comment: "Elementary" },
];

test("competency policy reproduces the supplied report formula", () => {
  const policy: AssessmentPolicy = {
    name: "Competency",
    version: 1,
    model: "competency_3",
    maxAssessmentScore: 3,
    courseworkWeight: 20,
    examWeight: 80,
    gradeBands,
  };
  const result = calculateAssessment({ a1: 2.5, a2: 2.7, a3: 3, a4: null, examScore: 81.25 }, policy);
  assert.equal(result.average, 2.73);
  assert.equal(result.identifier, 3);
  assert.equal(result.courseworkScore, 18.2);
  assert.equal(result.examWeightedScore, 65);
  assert.equal(result.finalScore, 83.2);
  assert.equal(result.grade, "A");
});

test("percentage policy weights coursework and exam independently", () => {
  const policy: AssessmentPolicy = {
    name: "Percentage",
    version: 1,
    model: "percentage_100",
    maxAssessmentScore: 100,
    courseworkWeight: 20,
    examWeight: 80,
    gradeBands,
  };
  const result = calculateAssessment({ a1: 70, a2: 80, a3: 90, a4: 60, examScore: 75 }, policy);
  assert.equal(result.average, 75);
  assert.equal(result.identifier, null);
  assert.equal(result.courseworkScore, 15);
  assert.equal(result.examWeightedScore, 60);
  assert.equal(result.finalScore, 75);
  assert.equal(result.grade, "B");
});

test("blank assessments are excluded from the coursework average", () => {
  const policy: AssessmentPolicy = {
    name: "Competency",
    version: 1,
    model: "competency_3",
    maxAssessmentScore: 3,
    courseworkWeight: 20,
    examWeight: 80,
    gradeBands,
  };
  const result = calculateAssessment({ a1: 1.9, a2: 1.7, a3: 1.7, examScore: 38.75 }, policy);
  assert.equal(result.average, 1.77);
  assert.equal(result.courseworkScore, 11.8);
  assert.equal(result.examWeightedScore, 31);
  assert.equal(result.finalScore, 42.8);
});

test("scores outside the configured model range are rejected", () => {
  const policy: AssessmentPolicy = {
    name: "Competency",
    version: 1,
    model: "competency_3",
    maxAssessmentScore: 3,
    courseworkWeight: 20,
    examWeight: 80,
    gradeBands,
  };
  assert.throws(
    () => calculateAssessment({ a1: 4, examScore: 70 }, policy),
    (error) => error instanceof AppError && error.status === 400,
  );
});
