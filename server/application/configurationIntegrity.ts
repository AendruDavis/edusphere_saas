import fs from "node:fs/promises";
import path from "node:path";
import type { ClientBase } from "pg";
import { getUploadRoot } from "../infrastructure/storageService";

export async function checkConfigurationIntegrity(client: ClientBase, postMigration = false) {
  await client.query("begin read only");
  try {
    const version = (await client.query("show server_version")).rows[0].server_version;
    const migrations = (await client.query("select name from schema_migrations order by name")).rows.map(row=>row.name as string);
    if (!migrations.includes("0006_scoped_authorization_and_report_branding.sql")) throw new Error("Configuration preflight requires migrations through 0006");
    const has7=migrations.includes("0007_configuration_workflow_hardening.sql");
    const data=(await client.query(`select
      (select count(*)::int from schools where active) as "activeSchools",
      (select count(*)::int from schools s where s.active and not exists(select 1 from school_settings ss where ss."schoolId"=s.id)) as "missingSettings",
      (select count(*)::int from school_settings where nullif(trim(name),'') is null or nullif(trim(currency),'') is null or nullif(trim("academicYear"),'') is null) as "blankRequiredSettings",
      (select count(*)::int from schools s join school_settings ss on ss."schoolId"=s.id where s.name is distinct from ss.name) as "identityMismatches",
      (select count(*)::int from school_settings where jsonb_typeof(classes)<>'array' or jsonb_typeof("classFees")<>'object' or jsonb_typeof("gradingScale")<>'array') as "invalidSettingDocuments",
      (select count(*)::int from fee_structures where jsonb_typeof(items)<>'array') as "invalidFeeDocuments",
      (select count(*)::int from (select "schoolId",lower(trim("className")),lower(trim(term)),lower(trim("academicYear")) from fee_structures fs
        where coalesce((to_jsonb(fs)->>'active')::boolean,true)
        group by "schoolId",lower(trim("className")),lower(trim(term)),lower(trim("academicYear")) having count(*)>1) duplicate_fees) as "duplicateActiveFeePeriods",
      (select count(*)::int from (select "schoolId",lower(trim(name)) from subjects where active group by "schoolId",lower(trim(name)) having count(*)>1) duplicate_subjects) as "duplicateActiveSubjects",
      (select count(*)::int from school_memberships sm where sm.active and not exists(select 1 from school_membership_roles smr where smr."membershipId"=sm.id)) as "membershipsWithoutRoles",
      (select count(*)::int from schools s where s.active and not exists(select 1 from school_memberships sm join school_membership_roles smr on smr."membershipId"=sm.id
        where sm."schoolId"=s.id and sm.active and smr.role='admin')) as "schoolsWithoutAdmin",
      (select count(*)::int from schools where active and "authorizationMode"='audit') as "schoolsInAuditMode"`)).rows[0];
    const periods = has7 ? (await client.query(`select "schoolId", "currentTerm" as term,"academicYear" as year,currency from school_settings order by "schoolId"`)).rows : [];
    const columns=(await client.query(`select column_name from information_schema.columns where table_schema='public' and table_name='student_balances' order by ordinal_position`)).rows.map(row=>row.column_name);
    const expected=["schoolId","studentId","studentName","reg","class","standardFee","paidAmount","outstandingAmount","status","term","year","creditAmount"];
    const logos=(await client.query("select logo, \"logoVariants\" from school_settings")).rows;
    let missingLogoFiles=0;
    const root=getUploadRoot();
    for (const url of new Set(logos.flatMap(row=>[row.logo,...Object.values(row.logoVariants||{})]).filter((url):url is string=>typeof url==='string' && url.startsWith('/uploads/')))) {
      const file=path.resolve(root,url.slice('/uploads/'.length));
      if (!file.startsWith(root+path.sep)) { missingLogoFiles++; continue; }
      try { if (!(await fs.stat(file)).isFile()) missingLogoFiles++; } catch { missingLogoFiles++; }
    }
    const failures: string[]=[];
    for (const field of ["missingSettings","blankRequiredSettings","invalidSettingDocuments","invalidFeeDocuments","membershipsWithoutRoles","schoolsWithoutAdmin"]) {
      if(data[field]>0) failures.push(field);
    }
    if(missingLogoFiles) failures.push("missingLogoFiles");
    if(postMigration) {
      if(!has7) failures.push("migration0007Missing");
      if(JSON.stringify(columns)!==JSON.stringify(expected)) failures.push("balanceViewColumns");
      for (const field of ["identityMismatches","duplicateActiveFeePeriods","duplicateActiveSubjects"]) if(data[field]>0) failures.push(field);
      if(periods.some(row=>!row.term?.trim())) failures.push("blankCurrentTerm");
    }
    await client.query("commit");
    return {mode:postMigration?"post-migration":"pre-migration",postgresVersion:version,migrations, ...data, missingLogoFiles,periods,failures,ok:failures.length===0};
  } catch(error) {
    await client.query("rollback");
    throw error;
  }
}
