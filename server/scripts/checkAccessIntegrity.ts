import "dotenv/config";
import { closePool, query } from "../infrastructure/database";

type IntegrityRow = {
  schools: number;
  auditSchools: number;
  activeMembershipsWithoutRoles: number;
  activeSchoolsWithoutAdmin: number;
  unlinkedParentAccounts: number;
  unlinkedStudentAccounts: number;
  unassignedTeacherAccounts: number;
  obsoleteParentConstraintExists: boolean;
};

async function main() {
  const result = await query<IntegrityRow>(`
    select
      (select count(*)::int from schools) as "schools",
      (select count(*)::int from schools where "authorizationMode" = 'audit') as "auditSchools",
      (select count(*)::int
       from school_memberships sm
       where sm.active = true
         and not exists (select 1 from school_membership_roles smr where smr."membershipId" = sm.id)) as "activeMembershipsWithoutRoles",
      (select count(*)::int
       from schools s
       where s.active = true
         and not exists (
           select 1 from school_memberships sm
           join school_membership_roles smr on smr."membershipId" = sm.id and smr.role = 'admin'
           where sm."schoolId" = s.id and sm.active = true
         )) as "activeSchoolsWithoutAdmin",
      (select count(*)::int
       from school_memberships sm
       join school_membership_roles smr on smr."membershipId" = sm.id and smr.role = 'parent'
       where sm.active = true
         and not exists (
           select 1 from parent_user_links pul
           where pul."schoolId" = sm."schoolId" and pul."userId" = sm."userId" and pul.active = true
         )) as "unlinkedParentAccounts",
      (select count(*)::int
       from school_memberships sm
       join school_membership_roles smr on smr."membershipId" = sm.id and smr.role = 'student'
       where sm.active = true
         and not exists (
           select 1 from student_user_links sul
           where sul."schoolId" = sm."schoolId" and sul."userId" = sm."userId" and sul.active = true
         )) as "unlinkedStudentAccounts",
      (select count(*)::int
       from school_memberships sm
       join school_membership_roles smr on smr."membershipId" = sm.id and smr.role = 'teacher'
       where sm.active = true
         and not exists (
           select 1 from teacher_assignments ta
           where ta."schoolId" = sm."schoolId" and ta."userId" = sm."userId" and ta.active = true
         )) as "unassignedTeacherAccounts",
      exists(select 1 from pg_constraint where conname = 'parents_contact_required') as "obsoleteParentConstraintExists"
  `);

  const integrity = result.rows[0];
  console.log(JSON.stringify(integrity, null, 2));
  if (
    integrity.activeMembershipsWithoutRoles > 0
    || integrity.activeSchoolsWithoutAdmin > 0
    || integrity.obsoleteParentConstraintExists
  ) {
    throw new Error("Critical authorization integrity checks failed");
  }
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(async () => closePool());
