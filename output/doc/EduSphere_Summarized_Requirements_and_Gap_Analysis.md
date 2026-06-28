# EduSphere School Management System

## Summarized Requirements and Current-State Gap Analysis

**Prepared from:** `Notes_260627_181554.docx` and `Notes_260627_182847.docx`  
**Project reviewed:** Current EduSphere React, Express, and PostgreSQL workspace  
**Assessment date:** 28 June 2026

## 1. Executive Summary

The supplied notes define a configurable, multi-school SaaS platform for Ugandan primary and secondary schools. The central requirement is that school identity, academic structure, roles, grading, report cards, invoices, and communication rules must be configurable by an administrator without code changes.

EduSphere already provides a substantial single-school foundation: PostgreSQL persistence, credential authentication, backend RBAC, student/staff management, fees, library, sickbay, attendance, academics, report preview/printing, notifications, and SSH deployment support. However, the target specification introduces major additions:

- true multi-school tenant isolation;
- complete settings-driven branding and academic configuration;
- jsPDF-based downloadable report cards and invoices;
- unified student status data across fees, attendance, library, and sickbay;
- face enrollment and production biometric integration;
- scheduled Email/SMS/WhatsApp notifications;
- removal of hardcoded school/report data.

The recommended delivery order is to establish tenant and settings architecture first, then consolidate student status data, implement PDF exports, and finally add outbound communication and biometric integrations.

## 2. Product Goal and Non-Negotiable Requirements

### Product Goal

Provide a secure multi-school SaaS platform for Ugandan primary and secondary schools, supporting administration, academics, finance, student welfare, attendance, communication, and branded documents.

### Non-Negotiable Requirements

- Every school-specific value must be editable through Admin Settings.
- No school name, motto, address, logo, grading scale, subject list, report color, payment detail, or term date may be hardcoded in report or invoice code.
- Every business record must belong to a school and be inaccessible to other schools.
- Roles and permissions must be enforced by the backend.
- Report cards and invoices must be downloadable as branded A4 PDFs.
- Student profile and report data must be computed from authoritative module records rather than manually duplicated.

## 3. Current Project Status

| Area | Current Status | Assessment |
|---|---|---|
| Application stack | React 19, Vite, TypeScript, Tailwind, Express | Implemented |
| Database | Direct PostgreSQL using `pg`, migrations and repositories | Implemented; differs from the notes' Supabase wording |
| Architecture | Domain/application/infrastructure/http backend layers | Implemented foundation |
| Authentication | Email/password login; role loaded from database | Implemented |
| Authorization | Backend RBAC with predefined roles | Implemented, but roles are not fully configurable |
| Deployment | SSH/Nginx/PM2/PostgreSQL deployment documentation; production previously reported live | Implemented operational foundation |
| School configuration | Singleton `school_settings` row for one school | Partial |
| Student management | CRUD, guardian contacts, photo, class, gender, DOB, fee fields | Partial against expanded biodata requirements |
| Academic marks | A1-A4, IDF, weighted score, configurable grading, lock and audit migration | Substantially implemented |
| Report card | Editable React/HTML A4 preview and browser printing | Partial; not jsPDF and contains hardcoded Nelson High branding |
| Fees | Fee structures, transactions, balances and statements | Partial |
| Library | Book CRUD and issue/return records | Partial |
| Sickbay | Health visit records, medication and statuses | Partial |
| Attendance | Manual attendance plus secret-protected biometric check-in endpoint | Partial |
| Notifications | In-app notifications table and UI | Partial; no external channel delivery |
| Invoice | Receipt/fee statement UI | Partial; no complete branded jsPDF invoice |

## 4. Consolidated Functional Requirements

### 4.1 Multi-School SaaS and Settings

The platform must support multiple schools with isolated data and independent configuration.

Required settings:

- school name, logo URL, motto, address, phone, email, DEO code and school type;
- primary and secondary brand colors;
- TIN, bank name, bank account and mobile-money/pay-code details;
- classes, streams, subjects, terms, academic years and term opening/closing dates;
- grading scales and report templates for Primary and Secondary;
- notification provider settings and reminder rules;
- report-sharing configuration, including link expiry;
- staff assignments to roles, classes and streams.

School type changes must update default class, subject, grading and report-template options without deleting existing historical records.

### 4.2 Users, Roles and Access

Required functional roles:

- Admin;
- Bursar/Accountant;
- Class Teacher;
- Headteacher;
- Librarian;
- Nurse;
- Parent;
- Student.

Admin must be able to create, edit, activate/deactivate and assign users. Permissions should be policy-driven. Class teachers must be assignable to one or more classes/streams. Existing driver and operational roles may remain as EduSphere extensions.

### 4.3 Student Profile

Student biodata must include:

- legal name, LIN, optional internal registration number and pay-code;
- date of birth, gender, class, stream and terminal year;
- guardian name, phone, email and WhatsApp number;
- photo and school status;
- biometric enrollment status.

The profile must display four computed status indicators:

- fees balance and payment status;
- active borrowed-book count with titles and due dates;
- current sickness status and last visit date;
- attendance summary as days attended over expected school days.

Admin and authorized teachers must be able to edit biodata. Status indicators must be read from their owning modules.

### 4.4 Attendance and Biometrics

The system must:

- enroll a student's face through an authorized browser camera workflow;
- securely store a biometric reference or provider identifier;
- accept device check-ins containing student identity, date, time and device identity;
- prevent duplicate check-ins according to a defined daily policy;
- record Present/Late status and timestamp;
- calculate term attendance totals;
- show attendance on the student profile and report card;
- trigger parent notifications after successful check-in.

The current integration endpoint should be retained and extended rather than replaced.

### 4.5 Academics and Report Card

Academic setup must be settings-driven. Marks must support coursework and examination weighting, grading, descriptors, teacher initials, submission locking and audit history.

The report card must:

- export client-side with jsPDF in A4 portrait format;
- use school settings for logo, name, motto, address, DEO code and colors;
- show LIN, pay-code, class/stream, gender, year and term;
- show attendance, fee status, sickness status and borrowed-book summary;
- show Subject, Coursework 20%, Exam 80%, Total, Grade and Descriptor;
- support class-teacher remarks and headteacher endorsement with wrapped text;
- show term opening date, official stamp warning and outstanding balance;
- download with a predictable filename such as `LIN_{lin}_Term{term}.pdf`.

The existing A1-A4 and IDF mark structure may remain as the assessment source. The PDF maps the A1-A4 average to Coursework 20% and IDF/exam to 80%.

### 4.6 Fees and Automated Reminders

Fees requirements:

- fee structures by school, class, term and academic year;
- due dates and itemized charges;
- balances visible on profile, report and invoice;
- daily reminder evaluation at 08:00 Africa/Kampala;
- reminder trigger when balance is above zero and due date is within seven days or overdue;
- Email, Africa's Talking SMS and WATI/UltraMsg WhatsApp delivery;
- configurable templates, retry status and delivery audit.

### 4.7 Library

The library must support:

- book CRUD and stock availability;
- normalized loans linked to both student and book;
- issue date, due date, return timestamp and loan status;
- issue/return workflows that update available stock atomically;
- active and overdue loans on student profiles and report cards;
- scheduled overdue notifications to parent/student.

### 4.8 Sickbay

The sickbay must support:

- visit date/time, diagnosis, medication, notes, attending nurse and status;
- statuses aligned to Active and Cleared, with optional detailed disposition;
- current status and last visit on student profile/report card;
- automatic parent notification after a visit is recorded;
- delivery audit without exposing sensitive medical details to unauthorized roles.

### 4.9 Branded Invoice PDF

The fees area must generate a separate jsPDF A4 invoice containing:

- school logo, name, address, TIN, DEO code and brand colors;
- invoice number, date, term, student, LIN and class;
- itemized Description, Quantity, Unit Price and Total;
- subtotal, VAT, total due, amount paid and balance;
- bank and mobile-money details, motto and thank-you footer;
- filename `INV_{LIN}_Term{term}.pdf`.

## 5. Required Alterations to the Current Project

### Architecture and Database

1. Replace the singleton school model with `schools` and `school_memberships`.
2. Add `schoolId` foreign keys to every school-owned table and scope repositories/API queries by the authenticated school.
3. Add tenant-aware uniqueness constraints, for example `(schoolId, reg)` instead of globally unique registration numbers.
4. Expand school settings with motto, DEO code, colors, TIN, payment details, report settings and notification settings.
5. Normalize classes, streams, subjects, terms and academic years instead of relying only on JSON arrays.
6. Add communication jobs and delivery-attempt tables.

### Existing Data Model Corrections

- Treat `students.reg` as an internal registration number and add a dedicated LIN field.
- Add guardian WhatsApp number, pay-code and biometric enrollment reference.
- Change attendance `studentId` from text to a student foreign key and store check-in time, device and source.
- Normalize borrowing records with `bookId` and `returnedAt`; remove title-only ownership.
- Align health records with diagnosis, nurse, visit timestamp and Active/Cleared semantics.
- Add fee due dates, invoice sequence and itemized invoice records.

### Frontend and Documents

- Replace hardcoded Nelson High report branding with selected-school settings.
- Add `jspdf` and `jspdf-autotable`; preserve the current HTML preview for editing and printing.
- Add a reusable report/invoice data-builder layer so preview and PDF use the same data.
- Add unified status indicators to Student Detail and report data.
- Add settings screens for all new configuration fields.
- Remove demo book auto-seeding from normal production UI behavior.

### Backend and Operations

- Add tenant context middleware and enforce tenant scope in every use case/repository.
- Add scheduled job execution suitable for PM2/cron at 08:00 EAT.
- Add provider adapters for Email, Africa's Talking and one selected WhatsApp provider.
- Store integration secrets only in environment variables or encrypted secret storage.
- Add idempotency and replay protection for biometric device check-ins.

## 6. Prioritized TODO Backlog

### P0 - Foundation and Data Safety

1. Confirm product identity: retain `EduSphere`; treat `Abacus` in the notes as source-document naming unless a formal rename is approved.
2. Design and migrate multi-school tenant tables and `schoolId` ownership.
3. Implement tenant-aware authentication context, authorization and repository filtering.
4. Expand school settings and remove hardcoded report branding.
5. Complete migration and production validation for academic mark structure/audit logging.

### P1 - Core User Outcomes

1. Build normalized academic setup: classes, streams, subjects, terms and years.
2. Complete unified student profile indicators.
3. Implement jsPDF UNEB report export using current marks and settings.
4. Implement branded jsPDF invoice export.
5. Normalize library loans and sickbay visits.
6. Correct attendance foreign keys and term summary calculation.

### P2 - Integrations and Automation

1. Implement notification templates, job queue and delivery logs.
2. Integrate SMTP Email and Africa's Talking SMS.
3. Select and integrate either WATI or UltraMsg, not both initially.
4. Add fee-due, overdue-book, sickbay and attendance notification triggers.
5. Add browser face enrollment and production biometric provider/device integration.
6. Add expiring, revocable report-sharing links.

### P3 - Quality, Rollout and Governance

1. Add automated tests for tenant isolation, RBAC, PDF data mapping and notification rules.
2. Add migration rollback/backup procedures and staged production rollout.
3. Add operational dashboards for failed jobs and provider delivery failures.
4. Add retention, consent and access policies for biometric and medical data.
5. Conduct mobile, print and accessibility testing across key workflows.

## 7. Acceptance Criteria

- An Admin can configure a new school without changing code.
- Two schools can use the same deployment without seeing or modifying each other's records.
- A user's role is loaded from the database and backend permissions prevent unauthorized actions.
- A student profile accurately shows fees, active loans, health status and attendance totals.
- A report PDF and invoice PDF download in A4 format with the selected school's branding and live data.
- Fee reminders, overdue alerts, sickbay alerts and check-in alerts produce auditable delivery records.
- Biometric check-ins are authenticated, idempotent and linked to valid students.
- Existing single-school production data is migrated without loss.

## 8. Assumptions and Decisions Requiring Confirmation

- PostgreSQL remains the production database; Supabase is not required unless managed hosting/auth/storage is reconsidered.
- EduSphere remains the product name.
- `Accountant` will serve as the initial Bursar role, while Class Teacher and Headteacher permissions will be added through assignments/policies.
- WATI or UltraMsg must be selected before WhatsApp implementation.
- Biometric vendor/device protocol and consent requirements must be confirmed before face data is stored.
- Existing HTML report preview remains available even after jsPDF export is added.
