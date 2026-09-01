import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import type { InvoiceData } from "../../../shared/invoice";

function hexToRgb(hex: string): [number, number, number] {
  const normalized = hex.replace("#", "");
  if (!/^[0-9a-fA-F]{6}$/.test(normalized)) return [0, 102, 204];
  return [
    Number.parseInt(normalized.slice(0, 2), 16),
    Number.parseInt(normalized.slice(2, 4), 16),
    Number.parseInt(normalized.slice(4, 6), 16),
  ];
}

function money(value: number, currency: string) {
  return `${currency} ${Math.round(value).toLocaleString()}`;
}

function safe(value: string) {
  return value.replace(/[^A-Za-z0-9_-]+/g, "_");
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

export async function exportInvoicePdf(invoice: InvoiceData) {
  const doc = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait" });
  const primary = hexToRgb(invoice.school.primaryColor);
  const logo = await imageData(invoice.school.logoUrl);
  const schoolTextX = logo ? 45 : 15;

  if (logo) doc.addImage(logo, "AUTO", 15, 10, 24, 24, undefined, "FAST");

  doc.setTextColor(...primary);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.text(invoice.school.name, schoolTextX, 20, { maxWidth: 110 });
  doc.setTextColor(71, 85, 105);
  doc.setFontSize(8);
  doc.text(invoice.school.address, schoolTextX, 26, { maxWidth: 110 });
  doc.text(`TIN: ${invoice.school.tin || "-"}  /  DEO: ${invoice.school.deoCode || "-"}`, schoolTextX, 31, { maxWidth: 110 });
  doc.setDrawColor(...primary);
  doc.setLineWidth(0.7);
  doc.line(15, 36, 195, 36);

  doc.setTextColor(15, 23, 42);
  doc.setFontSize(16);
  doc.text("INVOICE", 195, 19, { align: "right" });
  doc.setFontSize(8);
  doc.text(invoice.invoiceNumber, 195, 25, { align: "right" });
  doc.text(invoice.date, 195, 30, { align: "right" });

  doc.setFontSize(9);
  doc.text(`Student: ${invoice.student.name}`, 15, 48);
  doc.text(`LIN: ${invoice.student.lin}`, 15, 54);
  doc.text(`Class: ${invoice.student.class}`, 15, 60);
  doc.text(`Term: ${invoice.term} / ${invoice.year}`, 195, 48, { align: "right" });

  autoTable(doc, {
    startY: 68,
    margin: { left: 15, right: 15 },
    head: [["Description", "Qty", `Unit Price (${invoice.currency})`, `Total (${invoice.currency})`]],
    body: invoice.items.map((item) => [
      item.description,
      item.quantity,
      Math.round(item.unitPrice).toLocaleString(),
      Math.round(item.total).toLocaleString(),
    ]),
    theme: "grid",
    headStyles: { fillColor: primary, textColor: [255, 255, 255] },
    styles: { fontSize: 8, cellPadding: 2.5 },
    columnStyles: { 0: { cellWidth: 85 }, 1: { halign: "center" }, 2: { halign: "right" }, 3: { halign: "right" } },
  });

  const y = ((doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? 100) + 8;
  const totals = [
    ["Subtotal", money(invoice.subtotal, invoice.currency)],
    ["VAT", money(invoice.vat, invoice.currency)],
    ["Total Due", money(invoice.total, invoice.currency)],
    ["Amount Paid", money(invoice.paid, invoice.currency)],
    ["Balance Due", money(invoice.balance, invoice.currency)],
  ];
  doc.setFontSize(9);
  totals.forEach(([label, value], index) => {
    const lineY = y + index * 6;
    doc.setFont("helvetica", index === totals.length - 1 ? "bold" : "normal");
    doc.text(label, 145, lineY);
    doc.text(value, 195, lineY, { align: "right" });
  });

  doc.setFillColor(248, 250, 252);
  doc.rect(15, 225, 180, 38, "F");
  doc.setFont("helvetica", "bold");
  doc.text("PAYMENT DETAILS", 20, 233);
  doc.setFont("helvetica", "normal");
  doc.text(`Bank: ${invoice.school.bankName || "-"}`, 20, 240);
  doc.text(`Account: ${invoice.school.bankAccount || "-"}`, 20, 246);
  doc.text(`Mobile Money / Pay-code: ${invoice.school.payCode || "-"}`, 20, 252);
  doc.setFont("helvetica", "italic");
  doc.setTextColor(...primary);
  doc.text(invoice.school.motto || "Thank you.", 105, 278, { align: "center" });

  doc.save(`INV_${safe(invoice.student.lin)}_Term${safe(invoice.term)}.pdf`);
}
