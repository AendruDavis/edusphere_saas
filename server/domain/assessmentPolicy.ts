import { AppError } from "./errors";

export type AssessmentModel = "competency_3" | "percentage_100";

export type GradeBand = {
  min: number;
  grade: string;
  comment: string;
  description?: string;
};

export type AssessmentPolicy = {
  id?: string;
  name: string;
  version: number;
  model: AssessmentModel;
  maxAssessmentScore: number;
  courseworkWeight: number;
  examWeight: number;
  gradeBands: GradeBand[];
};

export type AssessmentInput = {
  a1?: number | null;
  a2?: number | null;
  a3?: number | null;
  a4?: number | null;
  examScore?: number | null;
};

export type AssessmentResult = {
  average: number | null;
  identifier: number | null;
  courseworkScore: number;
  examWeightedScore: number;
  finalScore: number;
  grade: string;
  descriptor: string;
};

function round(value: number) {
  return Math.round(value * 100) / 100;
}

function validateScore(value: number | null | undefined, max: number, label: string) {
  if (value === null || value === undefined) return null;
  if (!Number.isFinite(value) || value < 0 || value > max) {
    throw new AppError(400, `${label} must be between 0 and ${max}`);
  }
  return value;
}

export function calculateAssessment(input: AssessmentInput, policy: AssessmentPolicy): AssessmentResult {
  const assessments = [input.a1, input.a2, input.a3, input.a4]
    .map((value, index) => validateScore(value, policy.maxAssessmentScore, `A${index + 1}`))
    .filter((value): value is number => value !== null);

  if (assessments.length === 0) {
    throw new AppError(400, "At least one coursework assessment is required");
  }

  const examScore = validateScore(input.examScore, 100, "Exam score");
  if (examScore === null) throw new AppError(400, "Exam score is required");

  const average = round(assessments.reduce((sum, value) => sum + value, 0) / assessments.length);
  const courseworkScore = round((average / policy.maxAssessmentScore) * policy.courseworkWeight);
  const examWeightedScore = round((examScore / 100) * policy.examWeight);
  const finalScore = round(courseworkScore + examWeightedScore);
  const band = [...policy.gradeBands].sort((a, b) => b.min - a.min).find((entry) => finalScore >= entry.min);

  return {
    average,
    identifier: policy.model === "competency_3" ? Math.round(average) : null,
    courseworkScore,
    examWeightedScore,
    finalScore,
    grade: band?.grade ?? "-",
    descriptor: band?.comment ?? "Unconfigured",
  };
}
