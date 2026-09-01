import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import type { ProgressiveReportData } from "../../../shared/reporting";

function hexToRgb(hex: string): [number, number, number] {
  const normalized = hex.replace("#", "");
  if (!/^[0-9a-fA-F]{6}$/.test(normalized)) return [37, 99, 235];
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
    if (!response.ok) return null;
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

function money(value: number, currency: string) {
  return `${currency} ${Math.round(value).toLocaleString()}`;
}

export async function exportProgressiveReportPdf(report: ProgressiveReportData, currency = "UGX") {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4", compress: true });
  const settings = report.reportSettings;
  const primary = hexToRgb(report.school.primaryColor);
  const secondary = hexToRgb(report.school.secondaryColor);
  const logoUrl = settings.showLogo
    ? report.school.logoVariants.favicon || report.school.logoVariants.square || report.school.logoUrl
    : null;
  const photoUrl = settings.showStudentPhoto ? report.student.photoUrl : null;
  const [logo, photo] = await Promise.all([imageData(logoUrl), imageData(photoUrl)]);
  const compact = settings.preset === "compact";

  doc.setDrawColor(...primary);
  doc.setLineWidth(0.5);
  doc.rect(5, 5, 200, 287);

  if (logo) doc.addImage(logo, "AUTO", 12, 10, 25, 25, undefined, "FAST");
  if (photo) doc.addImage(photo, "AUTO", 173, 10, 22, 25, undefined, "FAST");

  doc.setTextColor(...primary);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text(report.school.name, 105, 14, { align: "center", maxWidth: 128 });
  doc.setTextColor(17, 24, 39);
  doc.setFontSize(8);
  doc.text(report.school.address, 105, 19, { align: "center", maxWidth: 128 });
  doc.setTextColor(...secondary);
  doc.text(report.school.phones, 105, 23, { align: "center", maxWidth: 128 });
  doc.setTextColor(17, 24, 39);
  doc.setFont("helvetica", "italic");
  doc.text(report.school.email, 105, 27, { align: "center", maxWidth: 128 });
  doc.setTextColor(...secondary);
  doc.text(report.school.motto, 105, 31, { align: "center", maxWidth: 128 });

  doc.setTextColor(...primary);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text(settings.title, 105, 41, { align: "center", maxWidth: 185 });

  const detailPairs: Array<[string, string]> = [
    ["LIN", report.student.lin],
    ["PAY-CODE", report.student.payCode],
    ["SECTION", report.student.section],
    ["GENDER", report.student.gender],
    ["ROLL", report.student.roll],
    ["YEAR", report.student.year],
    ["TERM", report.student.term],
    ["CLASS", report.student.class],
  ];
  if (settings.showPosition && report.summary.position > 0) {
    detailPairs.push(["POSITION", `${report.summary.position} / ${report.summary.classSize}`]);
  }

  doc.setFontSize(6.5);
  let y = 48;
  for (let offset = 0; offset < detailPairs.length; offset += 4) {
    detailPairs.slice(offset, offset + 4).forEach(([label, value], index) => {
      const x = 10 + index * 49;
      doc.setTextColor(17, 24, 39);
      doc.text(`${label}:`, x, y);
      doc.setTextColor(...secondary);
      doc.text(String(value || "-"), x + 14, y, { maxWidth: 33 });
    });
    y += 5;
  }
  doc.setTextColor(17, 24, 39);
  doc.text("NAME:", 10, y);
  doc.setTextColor(...primary);
  doc.setFontSize(8);
  doc.text(report.student.name, 22, y, { maxWidth: 175 });
  y += 4;

  const statusItems: string[] = [];
  if (settings.showAttendance) statusItems.push(`Attendance ${report.statusSummary.daysAttended}/${report.statusSummary.expectedSchoolDays || "-"}`);
  if (settings.showFees) statusItems.push(`Fees ${money(report.statusSummary.feesBalance, currency)}`);
  if (settings.showHealth) statusItems.push(`Health ${report.statusSummary.sicknessStatus}`);
  if (settings.showLibrary) statusItems.push(`Books ${report.statusSummary.booksBorrowed}`);
  if (statusItems.length) {
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(203, 213, 225);
    doc.rect(10, y, 190, 8, "FD");
    doc.setTextColor(71, 85, 105);
    doc.setFontSize(5.5);
    const width = 190 / statusItems.length;
    statusItems.forEach((item, index) => doc.text(item, 10 + width * index + width / 2, y + 5, { align: "center", maxWidth: width - 4 }));
    y += 10;
  } else {
    y += 2;
  }

  autoTable(doc, {
    startY: y,
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
    styles: {
      font: "helvetica",
      fontSize: compact || report.subjects.length > 14 ? 5.1 : 5.8,
      cellPadding: compact ? 0.75 : 1.1,
      halign: "center",
      lineColor: [190, 170, 170],
      lineWidth: 0.1,
    },
    headStyles: { fillColor: [255, 255, 255], textColor: [17, 24, 39], fontStyle: "bold" },
    footStyles: { fillColor: [241, 245, 249], textColor: [17, 24, 39], fontStyle: "bold" },
    alternateRowStyles: { fillColor: settings.preset === "competency" ? [240, 253, 244] : [236, 254, 255] },
    columnStyles: {
      0: { cellWidth: 37, halign: "left", textColor: primary, fontStyle: "bold" },
      11: { cellWidth: 21, textColor: settings.preset === "competency" ? secondary : [126, 34, 206], fontStyle: "bold" },
      12: { cellWidth: 8 },
    },
  });

  let currentY = (doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? 170;
  currentY += 4;
  doc.setFontSize(6);
  doc.setTextColor(17, 24, 39);
  const outcome = `PROJECT WORK: ${report.summary.projectWork}    OVERALL IDENTIFIER: ${report.summary.overallIdentifier || "-"}    OVERALL GRADE: ${report.summary.overallGrade}    OVERALL PERFORMANCE: ${report.summary.overallPerformance}    RESULT: ${report.summary.result}`;
  const outcomeLines = doc.splitTextToSize(outcome, 190);
  doc.text(outcomeLines, 10, currentY);
  currentY += outcomeLines.length * 3 + 2;

  const drawComment = (label: string, comment: string, startY: number) => {
    doc.setFont("helvetica", "bold");
    doc.setTextColor(17, 24, 39);
    doc.text(`${label} comment:`, 10, startY);
    doc.setFont("helvetica", "italic");
    doc.setTextColor(...secondary);
    const lines = doc.splitTextToSize(comment || "-", 142);
    doc.text(lines, 52, startY);
    return startY + Math.max(5, lines.length * 3 + 2);
  };
  currentY = drawComment(settings.classTeacherLabel, report.comments.classTeacherComment, currentY);
  currentY = drawComment(settings.headTeacherLabel, report.comments.headTeacherComment, currentY);

  if (currentY < 250 && report.gradeBands.length) {
    autoTable(doc, {
      startY: currentY,
      margin: { left: 10, right: 10 },
      body: report.gradeBands.map((band) => [band.grade, band.comment, band.description || `Performance at ${band.min}% and above.`]),
      theme: "grid",
      styles: { fontSize: 5.2, cellPadding: 0.8, lineColor: [190, 170, 170], lineWidth: 0.1 },
      columnStyles: { 0: { cellWidth: 8, halign: "center", fontStyle: "bold" }, 1: { cellWidth: 25, fontStyle: "bold" } },
    });
  }

  doc.setFont("helvetica", "bold");
  doc.setFontSize(5.5);
  doc.setTextColor(17, 24, 39);
  doc.text(`THIS TERM ENDS: ${report.summary.termClosesOn || "-"}`, 10, 281);
  doc.text(`NEXT TERM STARTS: ${report.summary.termOpensOn || "-"}`, 75, 281);
  if (settings.showFees) doc.text(`Fees: ${money(report.statusSummary.feesBalance, currency)}`, 200, 281, { align: "right" });
  doc.setFont("helvetica", "italic");
  doc.setTextColor(...secondary);
  doc.text(report.school.stampWarning, 105, 286, { align: "center", maxWidth: 140 });
  doc.setFont("helvetica", "normal");
  doc.setTextColor(100, 116, 139);
  doc.text(`Revision ${report.revision || 0}`, 200, 289, { align: "right" });

  doc.save(`LIN_${safeFilename(report.student.lin)}_Term${safeFilename(report.student.term)}_R${report.revision || 0}.pdf`);
}
