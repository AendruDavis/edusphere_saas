import assert from "node:assert/strict";
import test from "node:test";
import sharp from "sharp";
import { DEFAULT_REPORT_SETTINGS } from "../../shared/reportSettings";
import { openTestHarness } from "../testing/harness";
import { seedConfigurationFixtures } from "../testing/fixtures";
import { api, startTestApi } from "../testing/apiServer";
import { closePool } from "../infrastructure/database";
import { checkConfigurationIntegrity } from "../application/configurationIntegrity";

const migration6 = "0006_scoped_authorization_and_report_branding.sql";
const migration7 = "0007_configuration_workflow_hardening.sql";

test("configuration release checks", {timeout:180000}, async (t) => {
  const harness = await openTestHarness();
  Object.assign(process.env, harness.env);
  let server: Awaited<ReturnType<typeof startTestApi>> | undefined;
  try {
    let migrationReady = false;
    await t.test("fresh installation and repeat migration run", async () => {
      await harness.resetSchema();
      assert.ok((await harness.migrate()).includes(migration7));
      assert.deepEqual(await harness.migrate(), []);
      const columns = (await harness.client.query(`select column_name from information_schema.columns
        where table_schema='public' and table_name='student_balances' order by ordinal_position`)).rows.map(row=>row.column_name);
      assert.deepEqual(columns, ["schoolId","studentId","studentName","reg","class","standardFee","paidAmount","outstandingAmount","status","term","year","creditAmount"]);
      migrationReady = true;
    });
    if (!migrationReady) return;
    migrationReady = false;
    await t.test("populated 0006 upgrade preserves history and backfills only missing current-period fees", async () => {
      await harness.resetSchema();
      await harness.migrate(migration6);
      const schoolId = (await harness.client.query("select id from schools limit 1")).rows[0].id;
      await harness.client.query(`update school_settings set "classFees" = '{"P.1":999,"P.2":200,"P.3":0}' where "schoolId"=$1`, [schoolId]);
      await harness.client.query(`insert into fee_structures ("schoolId","className",term,"academicYear",items,"totalAmount","updatedAt") values
        ($1,'P.1','Term 1','2026/2027','[{"name":"Old","amount":50}]',50,'2020-01-01'),
        ($1,'p.1','term 1','2026/2027','[{"name":"Newest","amount":100}]',100,'2021-01-01')`, [schoolId]);
      assert.deepEqual(await harness.migrate(), [migration7]);
      const rows = (await harness.client.query("select * from fee_structures order by active, \"totalAmount\"")).rows;
      assert.equal(rows.length,3);
      assert.equal(rows.filter(row=>row.active).length,2);
      assert.equal(Number(rows.find(row=>row.className==='p.1').totalAmount),100);
      assert.deepEqual(rows.find(row=>row.className==='P.2').items, [{name:"Legacy class fee",amount:200}]);
      assert.deepEqual(await harness.migrate(), []);
      migrationReady = true;
    });
    if (!migrationReady) return;
    server = await startTestApi();
    const baseURL = server.baseURL;
    async function fixture() {
      const data = await seedConfigurationFixtures(harness.client);
      const login = await api(baseURL,"/api/auth/login",{method:"POST",body:{email:data.admin.email,pass:data.admin.password}});
      assert.equal(login.status,200);
      return {...data, session:{token:login.body.accessToken as string,schoolId:data.schoolId}};
    }
    async function login(account: {email:string;password:string;schoolId:string}) {
      const response=await api(baseURL,"/api/auth/login",{method:"POST",body:{email:account.email,pass:account.password}});
      assert.equal(response.status,200);
      return {token:response.body.accessToken as string,schoolId:account.schoolId};
    }
    const settingsPayload = (name: string) => ({name,logo:null,logoVariants:{},level:"Primary",classes:["P.1","P.2","P.3"],
      academicYear:"2026/2027",currentTerm:"Term 1",currency:"UGX",stampWarning:"",address:"",phone:"",email:"",
      reportSettings:{...DEFAULT_REPORT_SETTINGS,title:"Verified School Report"},gradingScale:[{min:0,grade:"P",comment:"Pass"}]});

    await t.test("preflight is read-only and detects inconsistent post-migration configuration", async () => {
      const f = await fixture();
      const before = (await harness.client.query('select to_jsonb(ss) as data from school_settings ss order by "schoolId"')).rows;
      assert.equal((await checkConfigurationIntegrity(harness.client)).ok, true);
      assert.equal((await checkConfigurationIntegrity(harness.client, true)).ok, true);
      assert.deepEqual((await harness.client.query('select to_jsonb(ss) as data from school_settings ss order by "schoolId"')).rows, before);
      await harness.client.query(`update school_settings set name='Stale identity', logo=$2 where "schoolId"=$1`, [f.schoolId, `/uploads/branding/${f.schoolId}/missing.webp`]);
      const invalid = await checkConfigurationIntegrity(harness.client, true);
      assert.equal(invalid.ok, false);
      assert.ok(invalid.failures.includes("identityMismatches"));
      assert.ok(invalid.failures.includes("missingLogoFiles"));
    });

    await t.test("school, report, grading and staged logo save together; branding revalidates", async () => {
      const f=await fixture();
      const before=await api(baseURL,`/api/public/schools/${f.slug}/branding`);
      const png=await sharp({create:{width:12,height:12,channels:4,background:"#126d4e"}}).png().toBuffer();
      const staged=await api(baseURL,"/api/storage/logo",{...f.session,method:"POST",body:{dataUrl:`data:image/png;base64,${png.toString("base64")}`}});
      assert.equal(staged.status,201);
      assert.equal((await harness.client.query('select logo from school_settings where "schoolId"=$1',[f.schoolId])).rows[0].logo,null);
      const payload={...settingsPayload("Updated School Identity"),logo:staged.body.url,logoVariants:staged.body.variants};
      const saved=await api(baseURL,"/api/settings/school",{...f.session,method:"PUT",body:payload});
      assert.equal(saved.status,200, saved.body.error);
      assert.equal(saved.body.stampWarning, "");
      const snapshot=await api(baseURL,"/api/app/snapshot",f.session);
      assert.equal(snapshot.status,200);
      assert.equal(snapshot.body.schoolSettings.name,payload.name);
      assert.equal(snapshot.body.schoolSettings.reportSettings.title,payload.reportSettings.title);
      assert.deepEqual(snapshot.body.schoolSettings.logoVariants,payload.logoVariants);
      const membership=await api(baseURL,"/api/auth/me",f.session);
      assert.equal(membership.body.schools.find((school:{schoolId:string})=>school.schoolId===f.schoolId).schoolName,payload.name);
      const after=await api(baseURL,`/api/public/schools/${f.slug}/branding`,{headers:{"If-None-Match":before.headers.get("etag")!}});
      assert.equal(after.status,200);
      assert.notEqual(after.headers.get("etag"),before.headers.get("etag"));
      assert.match(after.headers.get("cache-control")!,/must-revalidate/);
      assert.equal((await api(baseURL,`/api/public/schools/${f.slug}/branding`,{headers:{"If-None-Match":after.headers.get("etag")!}})).status,304);
      for (const url of Object.values(payload.logoVariants) as string[]) assert.equal((await fetch(`${baseURL}${url}`)).status,200);
      const grade=(await harness.client.query('select "gradeBands" from grading_policies where "schoolId"=$1 and active=true',[f.schoolId])).rows[0];
      assert.deepEqual(grade.gradeBands,payload.gradingScale);
      assert.equal(Number((await harness.client.query("select count(*) from audit_logs where action='settings.school_updated'")).rows[0].count),1);
      const teacher=await login(f.teacher);
      assert.equal((await api(baseURL,"/api/settings/school",{...teacher,method:"PUT",body:payload})).status,403);
      assert.equal((await api(baseURL,"/api/settings/school",{...f.session,method:"PUT",body:{...payload,logo:`/uploads/branding/${f.otherSchoolId}/fake.webp`}})).status,400);
    });

    await t.test("failed audit rolls back identity, report settings, grading and branding version", async () => {
      const f=await fixture();
      const before=(await harness.client.query('select to_jsonb(ss) as data from school_settings ss where "schoolId"=$1',[f.schoolId])).rows[0].data;
      await harness.client.query(`create sequence config_test_audit_attempt;
        create function config_test_fail_audit() returns trigger language plpgsql as $$
        begin if new.action='settings.school_updated' then perform nextval('config_test_audit_attempt'); raise exception 'injected test failure'; end if; return new; end $$;
        create trigger config_test_fail_audit before insert on audit_logs for each row execute function config_test_fail_audit()`);
      try {
        const response=await api(baseURL,"/api/settings/school",{...f.session,method:"PUT",body:settingsPayload("Should Roll Back")});
        assert.equal(response.status,500);
        assert.equal(response.body.error,"Database operation failed");
        assert.equal((await harness.client.query("select is_called from config_test_audit_attempt")).rows[0].is_called,true);
        const after=(await harness.client.query('select to_jsonb(ss) as data from school_settings ss where "schoolId"=$1',[f.schoolId])).rows[0].data;
        assert.deepEqual(after,before);
        assert.equal((await harness.client.query("select name from schools where id=$1",[f.schoolId])).rows[0].name,before.name);
        assert.equal(Number((await harness.client.query('select count(*) from grading_policies where "schoolId"=$1',[f.schoolId])).rows[0].count),0);
      } finally {
        await harness.client.query("drop trigger config_test_fail_audit on audit_logs; drop function config_test_fail_audit(); drop sequence config_test_audit_attempt");
      }
    });

    await t.test("multi-role creation, forced password change, resets and tenant boundaries", async () => {
      const f=await fixture();
      const created=await api(baseURL,"/api/users",{...f.session,method:"POST",body:{name:"New Account",email:"new.account@example.test",roles:["teacher","accountant"]}});
      assert.equal(created.status,201,created.body.error);
      assert.equal(created.headers.get("cache-control"),"no-store");
      assert.equal(created.body.temporaryPassword.length,20);
      assert.deepEqual(created.body.user.roles,["teacher","accountant"]);
      const newSession=await login({email:created.body.user.email,password:created.body.temporaryPassword,schoolId:f.schoolId});
      assert.equal((await api(baseURL,"/api/app/snapshot",newSession)).status,403);
      const changed=await api(baseURL,"/api/auth/change-password",{...newSession,method:"POST",body:{currentPassword:created.body.temporaryPassword,newPassword:f.admin.password,confirmPassword:f.admin.password}});
      assert.equal(changed.status,200);
      assert.equal(changed.body.user.mustChangePassword,false);
      assert.equal((await api(baseURL,"/api/app/snapshot",newSession)).status,401);
      const fresh={token:changed.body.accessToken,schoolId:f.schoolId};
      assert.equal((await api(baseURL,"/api/app/snapshot",fresh)).status,200);
      assert.equal((await api(baseURL,"/api/users",{...f.session,method:"POST",body:{name:"Duplicate",email:f.otherAdmin.email,roles:["teacher"]}})).status,409);
      assert.equal((await api(baseURL,`/api/users/${f.otherAdmin.id}`,{...f.session,method:"PATCH",body:{name:"Forbidden"}})).status,404);
      assert.equal((await api(baseURL,`/api/users/${f.otherAdmin.id}/roles`,{...f.session,method:"PUT",body:{roles:["teacher"]}})).status,404);
      assert.equal((await api(baseURL,`/api/users/${f.otherAdmin.id}/reset-password`,{...f.session,method:"POST",body:{confirmPassword:f.admin.password}})).status,404);
      const reset=await api(baseURL,`/api/users/${created.body.user.id}/reset-password`,{...f.session,method:"POST",body:{confirmPassword:f.admin.password}});
      assert.equal(reset.status,200);
      assert.equal(reset.headers.get("cache-control"),"no-store");
      assert.equal((await api(baseURL,"/api/app/snapshot",fresh)).status,401);
      const resetSession=await login({email:created.body.user.email,password:reset.body.temporaryPassword,schoolId:f.schoolId});
      assert.equal((await api(baseURL,"/api/app/snapshot",resetSession)).status,403);
      const audits=JSON.stringify((await harness.client.query("select action,metadata from audit_logs")).rows);
      assert.match(audits,/user.access_created/);
      assert.match(audits,/user.password_changed/);
      assert.match(audits,/user.password_reset/);
      assert.equal(audits.includes(created.body.temporaryPassword),false);
      assert.equal(audits.includes(reset.body.temporaryPassword),false);
      const snapshot=await api(baseURL,"/api/app/snapshot",f.session);
      assert.equal(JSON.stringify(snapshot.body).includes("passwordHash"),false);
      assert.equal(JSON.stringify(snapshot.body).includes("temporaryPassword"),false);
    });

    await t.test("administrator changes require confirmation and retain an administrator under concurrency", async () => {
      const f=await fixture();
      const path=`/api/users/${f.teacher.id}/roles`;
      assert.equal((await api(baseURL,path,{...f.session,method:"PUT",body:{roles:["teacher","admin"]}})).status,400);
      assert.equal((await api(baseURL,path,{...f.session,method:"PUT",body:{roles:["teacher","admin"],confirmPassword:"wrong"}})).status,400);
      assert.equal((await api(baseURL,path,{...f.session,method:"PUT",body:{roles:["teacher","admin"],confirmPassword:f.admin.password}})).status,200);
      assert.equal((await api(baseURL,path,{...f.session,method:"PUT",body:{roles:["teacher"],confirmPassword:f.admin.password}})).status,200);
      assert.equal((await api(baseURL,path,{...f.session,method:"PUT",body:{roles:[]}})).status,400);
      assert.equal((await api(baseURL,`/api/users/${f.admin.id}/roles`,{...f.session,method:"PUT",body:{roles:["teacher"],confirmPassword:f.admin.password}})).status,400);
      const second=await login(f.secondAdmin);
      const results=await Promise.all([
        api(baseURL,`/api/users/${f.secondAdmin.id}/roles`,{...f.session,method:"PUT",body:{roles:["teacher"],confirmPassword:f.admin.password}}),
        api(baseURL,`/api/users/${f.admin.id}/roles`,{...second,method:"PUT",body:{roles:["teacher"],confirmPassword:f.secondAdmin.password}}),
      ]);
      assert.equal(results.filter(result=>result.status===200).length,1);
      assert.ok(results.every(result=>[200,403,409].includes(result.status)));
      const count=(await harness.client.query(`select count(*) from school_memberships sm join school_membership_roles smr on smr."membershipId"=sm.id
        where sm."schoolId"=$1 and sm.active and smr.role='admin'`,[f.schoolId])).rows[0].count;
      assert.equal(Number(count),1);
    });

    await t.test("subject writes persist, reject duplicates, and retain historical marks", async () => {
      const f=await fixture();
      const created=await api(baseURL,"/api/subjects",{...f.session,method:"POST",body:{name:"Environmental Studies",code:"ENV",schoolType:"Primary"}});
      assert.equal(created.status,201);
      assert.equal((await api(baseURL,"/api/subjects",{...f.session,method:"POST",body:{name:" environmental studies "}})).status,409);
      assert.equal((await api(baseURL,"/api/subjects",{...f.session,method:"POST",body:{name:""}})).status,400);
      const teacher=await login(f.teacher);
      assert.equal((await api(baseURL,"/api/subjects",{...teacher,method:"POST",body:{name:"Forbidden Subject"}})).status,403);
      const other=await login(f.otherAdmin);
      assert.equal((await api(baseURL,`/api/subjects/${created.body.id}`,{...other,method:"PUT",body:{code:"OTHER"}})).status,404);
      assert.equal((await api(baseURL,`/api/subjects/${created.body.id}`,{...f.session,method:"PUT",body:{code:"EVS"}})).status,200);
      const list=await api(baseURL,"/api/subjects",f.session);
      assert.equal(list.body.find((subject:{id:string})=>subject.id===created.body.id).code,"EVS");
      assert.equal((await api(baseURL,`/api/subjects/${f.subjectId}`,{...f.session,method:"DELETE"})).status,200);
      const snapshot=await api(baseURL,"/api/app/snapshot",f.session);
      assert.equal(snapshot.body.subjects.find((subject:{id:string})=>subject.id===f.subjectId).active,false);
      assert.equal(snapshot.body.marks[0].subject,"Mathematics");
      assert.equal((await api(baseURL,`/api/subjects/${f.subjectId}`,{...f.session,method:"PUT",body:{active:true}})).status,200);
      const actions=(await harness.client.query("select action from audit_logs where entity='subjects'")).rows.map(row=>row.action);
      assert.ok(actions.includes("subject.created") && actions.includes("subject.updated") && actions.includes("subject.deactivated"));
    });

    await t.test("fees serialize JSON, calculate totals and period balances, and enforce linked access", async () => {
      const f=await fixture();
      await harness.client.query(`update school_settings set "reportSettings"=jsonb_set("reportSettings",'{showFees}','true') where "schoolId"=$1`,[f.schoolId]);
      const structure={className:"P.1",term:"Term 1",academicYear:"2026/2027",items:[{name:"Tuition",amount:100},{name:"Materials",amount:50}],totalAmount:1};
      const created=await api(baseURL,"/api/fee-structures",{...f.session,method:"POST",body:structure});
      assert.equal(created.status,201,created.body.error);
      assert.equal(created.body.totalAmount,150);
      assert.deepEqual(created.body.items,structure.items);
      assert.equal((await api(baseURL,"/api/fee-structures",{...f.session,method:"POST",body:{...structure,className:"p.1"}})).status,409);
      assert.equal((await api(baseURL,"/api/fee-structures",{...f.session,method:"POST",body:{...structure,term:"Term 2",items:[{name:"Invalid",amount:-1}]}})).status,400);
      assert.equal((await api(baseURL,"/api/fee-structures",{...f.session,method:"POST",body:{...structure,term:"Term 2",items:[{name:"Tuition",amount:300}]}})).status,201);
      for (const [term,year,amount] of [["Term 1","2026/2027",175],["Term 2","2026/2027",50],["Term 1","2025/2026",900]] as const) {
        const payment=await api(baseURL,"/api/fees/pay",{...f.session,method:"POST",body:{studentId:f.students[0].id,amount,term,year,method:"Cash",paidAt:"2026-09-01"}});
        assert.equal(payment.status,201,payment.body.error);
      }
      const balances=await api(baseURL,"/api/fees/balances",f.session);
      assert.equal(balances.body.balances.length,30);
      const own=balances.body.balances.find((balance:{studentId:string})=>balance.studentId===f.students[0].id);
      assert.equal(own.standardFee,150);
      assert.equal(own.paidAmount,175);
      assert.equal(own.outstandingAmount,0);
      assert.equal(own.creditAmount,25);
      const term2=await api(baseURL,"/api/fees/balances?term=Term%202&year=2026%2F2027",f.session);
      assert.equal(term2.body.balances.find((balance:{studentId:string})=>balance.studentId===f.students[0].id).outstandingAmount,250);
      const report=await api(baseURL,`/api/reports/students/${f.students[0].id}/progressive?term=Term%202&year=2026%2F2027`,f.session);
      assert.equal(report.status,200,report.body.error);
      assert.equal(report.body.statusSummary.feesBalance,250);
      const parent=await login(f.parent);
      const child=await login(f.student);
      assert.equal((await api(baseURL,"/api/fees/balances",parent)).body.balances.length,2);
      assert.equal((await api(baseURL,"/api/fees/balances",child)).body.balances.length,1);
      const teacher=await login(f.teacher);
      assert.equal((await api(baseURL,"/api/fees/balances",teacher)).status,403);
      const teacherSnapshot=await api(baseURL,"/api/app/snapshot",teacher);
      assert.deepEqual(teacherSnapshot.body.feeBalances,[]);
      assert.ok(teacherSnapshot.body.students.every((student:Record<string,unknown>)=>!("feesBalance" in student) && !("totalFeesPaid" in student)));
      assert.equal((await api(baseURL,"/api/fees/pay",{...parent,method:"POST",body:{studentId:f.students[0].id,amount:1,term:"Term 1",year:"2026/2027"}})).status,403);
      const audits=(await harness.client.query("select action from audit_logs where action in ('fee_structure.created','fee_payment.recorded')")).rows;
      assert.equal(audits.length,5);
    });
  } finally {
    await server?.close();
    await closePool();
    await harness.close();
  }
});
