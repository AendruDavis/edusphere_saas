import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import type { ProgressiveReportData } from "../../../shared/reporting";

function hexToRgb(hex: string): [number, number, number] {
  const normalized = hex.replace("#", "");
  if (!/^[0-9a-fA-F]{6}$/.test(normalized)) return [0, 102, 204];
  return [
    Number.parseInt(normalized.slice(0, 2), 16),
    Number.parseInt(normalized.slice(2, 4), 16),
    Number.parseInt(normalized.slice(4, 6), 16),
  ];
}

async function imageData(url: string | null) {
  if (!url) return null;
  try {
    const response = await fetch(url);
    const blob = await response.blob();
    return await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = reject;
      reader.onload = () => resolve(String(reader.result));
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

function score(value: number | null) {
  return value === null ? "" : String(Math.round(value * 10) / 10);
}

function safeFilename(value: string) {
  return value.replace(/[^A-Za-z0-9_-]+/g, "_");
}

export async function exportProgressiveReportPdf(report: ProgressiveReportData) {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4", compress: true });
  const primary = hexToRgb(report.school.primaryColor);
  const secondary = hexToRgb(report.school.secondaryColor);
  const [logo, photo] = await Promise.all([imageData(report.school.logoUrl), imageData(report.student.photoUrl)]);

  doc.setDrawColor(...primary);
  doc.setLineWidth(0.5);
  doc.rect(5, 5, 200, 287);

  if (logo) doc.addImage(logo, "AUTO", 12, 10, 25, 25, undefined, "FAST");
  else {
    doc.setFontSize(7);
    doc.rect(12, 10, 25, 25);
    doc.text("SCHOOL LOGO", 24.5, 23, { align: "center" });
  }

  if (photo) doc.addImage(photo, "AUTO", 173, 10, 22, 25, undefined, "FAST");
  else {
    doc.setFontSize(7);
    doc.rect(173, 10, 22, 25);
    doc.text("PHOTO", 184, 23, { align: "center" });
  }

  doc.setTextColor(...primary);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text(report.school.name, 105, 14, { align: "center" });
  doc.setTextColor(17, 24, 39);
  doc.setFontSize(8);
  doc.text(report.school.address, 105, 19, { align: "center" });
  doc.setTextColor(...secondary);
  doc.text(report.school.phones, 105, 23, { align: "center" });
  doc.setTextColor(17, 24, 39);
  doc.setFont("helvetica", "italic");
  doc.text(report.school.email, 105, 27, { align: "center" });
  doc.setTextColor(...secondary);
  doc.text(report.school.motto, 105, 31, { align: "center" });

  doc.setTextColor(...primary);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text("END OF TERM PROGRESSIVE REPORT", 105, 41, { align: "center" });

  const details = [
    ["LIN", report.student.lin, "PAY-CODE", report.student.payCode, "SECTION", report.student.section, "GENDER", report.student.gender],
    ["ROLL", report.student.roll, "YEAR", report.student.year, "TERM", report.student.term, "CLASS", report.student.class],
  ];
  doc.setFontSize(6.5);
  let y = 48;
  for (const row of details) {
    for (let index = 0; index < 4; index += 1) {
      const x = 10 + index * 49;
      doc.setTextColor(17, 24, 39);
      doc.text(`${row[index * 2]}:`, x, y);
      doc.setTextColor(...secondary);
      doc.text(String(row[index * 2 + 1] || "-"), x + 11, y);
    }
    y += 5;
  }
  doc.setTextColor(17, 24, 39);
  doc.text("NAME:", 10, y);
  doc.setTextColor(...primary);
  doc.setFontSize(8);
  doc.text(report.student.name, 22, y);

  y += 4;
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(203, 213, 225);
  doc.rect(10, y, 190, 8, "FD");
  doc.setTextColor(71, 85, 105);
  doc.setFontSize(5.5);
  const statusItems = [
    `Attendance ${report.statusSummary.daysAttended}/${report.statusSummary.expectedSchoolDays || "-"}`,
    `Fees ${report.statusSummary.feesBalance.toLocaleString()}`,
    `Sickness ${report.statusSummary.sicknessStatus}`,
    `Books ${report.statusSummary.booksBorrowed}`,
  ];
  statusItems.forEach((item, index) => doc.text(item, 15 + index * 47, y + 5));

  autoTable(doc, {
    startY: y + 10,
    margin: { left: 10, right: 10 },
    head: [["SUBJECT", "A1", "A2", "A3", "A4", "AVG", "IDF", "20%", "80%", "100%", "GRD", "DESCRIPTOR", "INIT"]],
    body: report.subjects.map((subject) => [
      subject.subject.toUpperCase(),
      score(subject.a1),
      score(subject.a2),
      score(subject.a3),
      score(subject.a4),
      score(subject.average),
      score(subject.identifier),
      score(subject.courseworkScore),
      score(subject.examWeightedScore),
      score(subject.finalScore),
      subject.grade,
      subject.descriptor,
      subject.teacherInitials,
    ]),
    foot: [["AVERAGES", "", "", "", "", "", "", "", "", score(report.summary.average), report.summary.overallGrade, report.summary.overallPerformance, ""]],
    theme: "grid",
    styles: { font: "helvetica", fontSize: report.subjects.length > 14 ? 5.2 : 5.8, cellPadding: 1.1, halign: "center", lineColor: [190, 170, 170], lineWidth: 0.1 },
    headStyles: { fillColor: [255, 255, 255], textColor: [17, 24, 39], fontStyle: "bold" },
    footStyles: { fillColor: [241, 245, 249], textColor: [17, 24, 39], fontStyle: "bold" },
    alternateRowStyles: { fillColor: [236, 254, 255] },
    columnStyles: {
      0: { cellWidth: 37, halign: "left", textColor: primary, fontStyle: "bold" },
      11: { cellWidth: 21, textColor: [126, 34, 206], fontStyle: "bold" },
      12: { cellWidth: 8 },
    },
  });

  let currentY = (doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? 170;
  currentY += 4;
  doc.setFontSize(6);
  doc.setTextColor(17, 24, 39);
  doc.text(
    `PROJECT WORK: ${report.summary.projectWork}    OVERALL IDENTIFIER: ${report.summary.overallIdentifier || "-"}    OVERALL GRADE: ${report.summary.overallGrade}    OVERALL PERFORMANCE: ${report.summary.overallPerformance}    RESULT: ${report.summary.result}`,
    10,
    currentY,
  );
  currentY += 5;
  doc.setFont("helvetica", "bold");
  doc.text("Class Teacher's Comment:", 10, currentY);
  doc.setFont("helvetica", "italic");
  doc.setTextColor(...secondary);
  doc.text(doc.splitTextToSize(report.comments.classTeacherComment || "-", 145), 46, currentY);
  currentY += 7;
  doc.setFont("helvetica", "bold");
  doc.setTextColor(17, 24, 39);
  doc.text("Head teacher's Comment:", 10, currentY);
  doc.setFont("helvetica", "italic");
  doc.setTextColor(...secondary);
  doc.text(doc.splitTextToSize(report.comments.headTeacherComment || "-", 145), 46, currentY);
  currentY += 5;

  autoTable(doc, {
    startY: currentY,
    margin: { left: 10, right: 10 },
    body: report.gradeBands.map((band) => [band.grade, band.comment, band.description || `Performance at ${band.min}% and above.`]),
    theme: "grid",
    styles: { fontSize: 5.2, cellPadding: 0.8, lineColor: [190, 170, 170], lineWidth: 0.1 },
    columnStyles: { 0: { cellWidth: 8, halign: "center", fontStyle: "bold" }, 1: { cellWidth: 25, fontStyle: "bold" } },
  });

  doc.setFont("helvetica", "bold");
  doc.setFontSize(5.5);
  doc.setTextColor(17, 24, 39);
  doc.text(`THIS TERM ENDS: ${report.summary.termClosesOn || "-"}`, 10, 282);
  doc.text(`NEXT TERM STARTS: ${report.summary.termOpensOn || "-"}`, 75, 282);
  doc.text(`Fees Balance: ${report.statusSummary.feesBalance.toLocaleString()}`, 200, 282, { align: "right" });
  doc.setFont("helvetica", "italic");
  doc.setTextColor(...secondary);
  doc.text(report.school.stampWarning, 105, 287, { align: "center" });

  doc.save(`LIN_${safeFilename(report.student.lin)}_Term${safeFilename(report.student.term)}.pdf`);
}
