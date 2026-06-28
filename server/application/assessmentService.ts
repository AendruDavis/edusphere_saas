import { assertFound } from "../domain/errors";
import {
  calculateAssessment,
  type AssessmentModel,
  type AssessmentPolicy,
  type GradeBand,
} from "../domain/assessmentPolicy";
import type { TenantContext } from "../domain/tenancy";
import { query } from "../infrastructure/database";
import type { RecordData } from "../infrastructure/postgresRepository";

type PolicyRow = {
  id: string;
  name: string;
  version: number;
  model: AssessmentModel;
  maxAssessmentScore: string | number;
  courseworkWeight: string | number;
  examWeight: string | number;
  gradeBands: GradeBand[];
};

function optionalNumber(value: unknown) {
  if (value === "" || value === null || value === undefined) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : Number.NaN;
}

export class AssessmentService {
  async calculateMark(tenant: TenantContext, payload: RecordData, existing?: RecordData | null) {
    const requestedPolicyId = String(payload.gradingPolicyId ?? existing?.gradingPolicyId ?? "");
    const result = await query<PolicyRow>(
      `select id, name, version, model,
              "maxAssessmentScore", "courseworkWeight", "examWeight", "gradeBands"
       from grading_policies
       where "schoolId" = $1
         and ($2 = '' or id = $2::uuid)
         and active = true
       order by version desc
       limit 1`,
      [tenant.schoolId, requestedPolicyId],
    );
    const row = assertFound(result.rows[0], "No active grading policy is configured");
    const policy: AssessmentPolicy = {
      id: row.id,
      name: row.name,
      version: row.version,
      model: row.model,
      maxAssessmentScore: Number(row.maxAssessmentScore),
      courseworkWeight: Number(row.courseworkWeight),
      examWeight: Number(row.examWeight),
      gradeBands: Array.isArray(row.gradeBands) ? row.gradeBands : [],
    };

    const a1 = optionalNumber(payload.a1 ?? existing?.a1 ?? payload.score ?? existing?.score);
    const a2 = optionalNumber(payload.a2 ?? existing?.a2 ?? payload.score ?? existing?.score);
    const a3 = optionalNumber(payload.a3 ?? existing?.a3 ?? payload.score ?? existing?.score);
    const a4 = optionalNumber(payload.a4 ?? existing?.a4 ?? payload.score ?? existing?.score);
    const examScore = optionalNumber(payload.examScore ?? existing?.examScore ?? payload.idf ?? existing?.idf ?? payload.score ?? existing?.score);
    const calculated = calculateAssessment({ a1, a2, a3, a4, examScore }, policy);

    return {
      ...payload,
      a1,
      a2,
      a3,
      a4,
      idf: calculated.identifier,
      examScore,
      gradingPolicyId: policy.id,
      assessmentModel: policy.model,
      courseworkScore: calculated.courseworkScore,
      examWeightedScore: calculated.examWeightedScore,
      finalScore: calculated.finalScore,
      score: calculated.finalScore,
      identifier: calculated.identifier,
      policySnapshot: {
        ...policy,
        grade: calculated.grade,
        descriptor: calculated.descriptor,
      },
    };
  }
}
