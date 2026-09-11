import { randomBytes } from "node:crypto";
import type { ClientBase } from "pg";
import type { SchoolRole } from "../../shared/permissions";
import { DEFAULT_REPORT_SETTINGS } from "../../shared/reportSettings";
import { passwordTools } from "../infrastructure/authService";

export async function seedConfigurationFixtures(client: ClientBase) {
  await client.query("truncate schools, users cascade");
  const schools = (await client.query(`insert into schools (name, slug, "authorizationMode") values
    ('Configuration Test School', 'config-test-school', 'enforce'),
    ('Second Test School', 'second-test-school', 'enforce') returning id, slug`)).rows;
  const schoolId: string = schools[0].id;
  const otherSchoolId: string = schools[1].id;
  for (const school of schools) {
    await client.query(`insert into school_settings ("schoolId", name, classes, "academicYear", "reportSettings")
      values ($1, $2, '["P.1","P.2","P.3"]', '2026/2027', $3::jsonb)`,
    [school.id, school.id === schoolId ? "Configuration Test School" : "Second Test School", JSON.stringify(DEFAULT_REPORT_SETTINGS)]);
  }
  const password = `Test-${randomBytes(16).toString("hex")}`;
  const passwordHash = passwordTools.hashPassword(password);
  const createAccount = async (name: string, roles: SchoolRole[], tenantId = schoolId) => {
    const email = `${name.toLowerCase().replace(/ /g, ".")}@example.test`;
    const user = (await client.query(`insert into users (name,email,role,"passwordHash") values ($1,$2,$3,$4) returning id`,
      [name,email,roles[0],passwordHash])).rows[0];
    const membership = (await client.query(`insert into school_memberships ("schoolId","userId",role) values ($1,$2,$3) returning id`,
      [tenantId,user.id,roles[0]])).rows[0];
    for (const role of roles) await client.query(`insert into school_membership_roles ("membershipId",role) values ($1,$2)`, [membership.id,role]);
    return { id: user.id as string, email, password, schoolId: tenantId };
  };
  const admin = await createAccount("Primary Administrator", ["admin"]);
  const secondAdmin = await createAccount("Second Administrator", ["admin"]);
  const otherAdmin = await createAccount("Other School Administrator", ["admin"], otherSchoolId);
  const teacher = await createAccount("Subject Teacher", ["teacher"]);
  const parent = await createAccount("Linked Guardian", ["parent"]);
  const student = await createAccount("Linked Student", ["student"]);
  const accountant = await createAccount("School Accountant", ["accountant"]);
  const yearId = (await client.query(`insert into academic_years ("schoolId",name,active) values ($1,'2026/2027',true) returning id`, [schoolId])).rows[0].id;
  await client.query(`insert into academic_terms ("schoolId","academicYearId",name,active) values ($1,$2,'Term 1',true)`, [schoolId,yearId]);
  const classId = (await client.query(`insert into school_classes ("schoolId",name) values ($1,'P.1') returning id`, [schoolId])).rows[0].id;
  const subjectId = (await client.query(`insert into subjects ("schoolId",name,code,"schoolType") values ($1,'Mathematics','MATH','Primary') returning id`, [schoolId])).rows[0].id;
  await client.query(`insert into teacher_assignments ("schoolId","userId","academicYearId","classId","subjectId") values ($1,$2,$3,$4,$5)`, [schoolId,teacher.id,yearId,classId,subjectId]);
  const students: Array<{id: string; name: string; reg: string; class: string}> = [];
  for (let index=1; index<=30; index++) {
    const record = (await client.query(`insert into students ("schoolId",name,reg,class,status) values ($1,$2,$3,'P.1','active') returning id,name,reg,class`,
      [schoolId, `Student ${String(index).padStart(2,"0")} With A Long Family Name`, `TEST-${index}`])).rows[0];
    students.push(record);
  }
  await client.query(`insert into students ("schoolId",name,reg,class,status) values ($1,'Other School Student','OTHER-1','P.1','active')`, [otherSchoolId]);
  const parentId = (await client.query(`insert into parents ("schoolId","fullName",email) values ($1,'Linked Guardian','guardian@example.test') returning id`, [schoolId])).rows[0].id;
  await client.query(`insert into parent_user_links ("schoolId","parentId","userId") values ($1,$2,$3)`, [schoolId,parentId,parent.id]);
  await client.query(`insert into student_parents ("schoolId","parentId","studentId") values ($1,$2,$3),($1,$2,$4)`, [schoolId,parentId,students[0].id,students[1].id]);
  await client.query(`insert into student_user_links ("schoolId","studentId","userId") values ($1,$2,$3)`, [schoolId,students[0].id,student.id]);
  await client.query(`insert into marks ("schoolId","studentId",subject,score,term,year) values ($1,$2,'Mathematics',80,'Term 1','2026/2027')`, [schoolId,students[0].id]);
  return {schoolId, otherSchoolId, slug: schools[0].slug as string, admin,secondAdmin,otherAdmin,teacher,parent,student,accountant,students,subjectId,yearId,classId};
}

export type ConfigurationFixtures = Awaited<ReturnType<typeof seedConfigurationFixtures>>;
