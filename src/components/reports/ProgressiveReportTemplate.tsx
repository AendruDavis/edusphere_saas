import type { CSSProperties } from "react";
import type { ProgressiveReportData } from "../../../shared/reporting";
import { formatCurrency } from "../../lib/utils";
import "./progressive-report.css";

type ReportStyle = CSSProperties & {
  "--report-primary": string;
  "--report-secondary": string;
};

function score(value: number | null) {
  return value === null ? "" : Number(value).toFixed(value % 1 === 0 ? 0 : 1);
}

export function ProgressiveReportTemplate({
  report,
  currency,
  editable = false,
  canEditHeadComment = false,
  onCommentChange,
}: {
  report: ProgressiveReportData;
  currency: string;
  editable?: boolean;
  canEditHeadComment?: boolean;
  onCommentChange?: (field: "classTeacherComment" | "headTeacherComment", value: string) => void;
}) {
  const settings = report.reportSettings;
  const style: ReportStyle = {
    "--report-primary": report.school.primaryColor,
    "--report-secondary": report.school.secondaryColor,
  };
  const logoUrl = report.school.logoVariants.wide || report.school.logoVariants.square || report.school.logoUrl;
  const showStatusLine = settings.showAttendance || settings.showFees || settings.showHealth || settings.showLibrary;
  const detailRows: Array<[string, string]> = [
    ["LIN:", report.student.lin],
    ["PAY-CODE:", report.student.payCode],
    ["SECTION:", report.student.section],
    ["GENDER:", report.student.gender],
    ["ROLL:", report.student.roll],
    ["YEAR:", report.student.year],
    ["TERM:", report.student.term],
    ["CLASS:", report.student.class],
  ];
  if (settings.showPosition && report.summary.position > 0) {
    detailRows.push(["POSITION:", `${report.summary.position} / ${report.summary.classSize}`]);
  }

  return (
    <article id="progressive-report-print" className={`progressive-report-sheet progressive-report-${settings.preset}`} style={style}>
      <header className="progressive-report-header">
        <div className="progressive-report-logo">
          {settings.showLogo && logoUrl ? <img src={logoUrl} alt={`${report.school.name} logo`} /> : null}
        </div>
        <div>
          <h1 className="progressive-school-name">{report.school.name}</h1>
          <p className="progressive-school-contact">{report.school.address}</p>
          <p className="progressive-school-contact secondary">{report.school.phones}</p>
          <p className="progressive-school-contact"><em>{report.school.email}</em></p>
          {report.school.motto && <p className="progressive-school-contact secondary">{report.school.motto}</p>}
        </div>
        <div className="progressive-report-photo">
          {settings.showStudentPhoto && report.student.photoUrl ? <img src={report.student.photoUrl} alt={report.student.name} /> : null}
        </div>
      </header>

      <h2 className="progressive-report-title">{settings.title}</h2>

      <section className="progressive-student-details">
        {detailRows.map(([label, value]) => (
          <div className="progressive-detail" key={label}><span>{label}</span><strong>{value || "-"}</strong></div>
        ))}
        <div className="progressive-detail progressive-student-name"><span>NAME:</span><strong>{report.student.name}</strong></div>
      </section>

      {showStatusLine && (
        <section className="progressive-status-line">
          {settings.showAttendance && <div><span>Attendance</span><strong>{report.statusSummary.daysAttended}/{report.statusSummary.expectedSchoolDays || "-"}</strong></div>}
          {settings.showFees && <div><span>Fees balance</span><strong>{formatCurrency(report.statusSummary.feesBalance, currency)}</strong></div>}
          {settings.showHealth && <div><span>Health</span><strong>{report.statusSummary.sicknessStatus}</strong></div>}
          {settings.showLibrary && <div title={report.statusSummary.borrowedBookTitles.join(", ")}><span>Books borrowed</span><strong>{report.statusSummary.booksBorrowed}</strong></div>}
        </section>
      )}

      <table className="progressive-marks-table">
        <thead>
          <tr>
            {["SUBJECT", "A1", "A2", "A3", "A4", "AVG", "IDF", "20%", "80%", "100%", "GRD", "DESCRIPTOR", "INIT"].map((heading) => <th key={heading}>{heading}</th>)}
          </tr>
        </thead>
        <tbody>
          {report.subjects.map((subject) => (
            <tr key={subject.id}>
              <td className="progressive-subject-name">{subject.subject.toUpperCase()}</td>
              <td>{score(subject.a1)}</td>
              <td>{score(subject.a2)}</td>
              <td>{score(subject.a3)}</td>
              <td>{score(subject.a4)}</td>
              <td>{score(subject.average)}</td>
              <td>{score(subject.identifier)}</td>
              <td>{score(subject.courseworkScore)}</td>
              <td>{score(subject.examWeightedScore)}</td>
              <td><strong>{score(subject.finalScore)}</strong></td>
              <td className="progressive-grade">{subject.grade}</td>
              <td className="progressive-descriptor">{subject.descriptor}</td>
              <td>{subject.teacherInitials}</td>
            </tr>
          ))}
          {!report.subjects.length && <tr><td colSpan={13} className="progressive-no-marks">No marks available for this period.</td></tr>}
          <tr className="progressive-averages">
            <td>AVERAGES</td>
            <td colSpan={8}></td>
            <td>{score(report.summary.average)}</td>
            <td>{report.summary.overallGrade}</td>
            <td>{report.summary.overallPerformance}</td>
            <td></td>
          </tr>
        </tbody>
      </table>

      <section className="progressive-outcomes">
        <div><span>PROJECT WORK:</span> {report.summary.projectWork}</div>
        <div><span>OVERALL IDENTIFIER:</span> {report.summary.overallIdentifier || "-"}</div>
        <div><span>OVERALL GRADE:</span> {report.summary.overallGrade}</div>
        <div><span>OVERALL PERFORMANCE:</span> {report.summary.overallPerformance}</div>
        <div><span>RESULT:</span> {report.summary.result}</div>
      </section>

      <section className="progressive-comments">
        <label>
          {settings.classTeacherLabel} comment:
          <textarea readOnly={!editable} value={report.comments.classTeacherComment} onChange={(event) => onCommentChange?.("classTeacherComment", event.target.value)} />
        </label>
        <label>
          {settings.headTeacherLabel} comment:
          <textarea readOnly={!canEditHeadComment} value={report.comments.headTeacherComment} onChange={(event) => onCommentChange?.("headTeacherComment", event.target.value)} />
        </label>
      </section>

      <table className="progressive-descriptor-table">
        <tbody>
          {report.gradeBands.map((band) => (
            <tr key={`${band.grade}-${band.min}`}><td>{band.grade}</td><td>{band.comment}</td><td>{band.description || `Performance at ${band.min}% and above.`}</td></tr>
          ))}
        </tbody>
      </table>

      <table className="progressive-grade-table">
        <tbody>
          <tr>{report.gradeBands.map((band) => <td key={band.grade}>{band.grade}</td>)}</tr>
          <tr>{report.gradeBands.map((band, index) => { const upper = index === 0 ? 100 : report.gradeBands[index - 1].min - 1; return <td key={band.grade}>{band.min} - {upper}</td>; })}</tr>
        </tbody>
      </table>

      <footer className="progressive-report-footer">
        <span>THIS TERM ENDS: {report.summary.termClosesOn || "-"}</span>
        <span>{report.school.stampWarning}</span>
        {settings.showFees && <span>Fees Balance: {formatCurrency(report.statusSummary.feesBalance, currency)}</span>}
        <span>NEXT TERM STARTS: {report.summary.termOpensOn || "-"}</span>
        <span>{report.school.reportFooter}</span>
        <span>Revision {report.revision || 0}</span>
      </footer>
    </article>
  );
}
