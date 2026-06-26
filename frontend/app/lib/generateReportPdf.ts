import { toPng } from "html-to-image";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { MEAL_TYPE_LABELS, ReportResponse } from "./api";

const PDF_MARGIN = 14;
const HEADER_COLOR: [number, number, number] = [99, 102, 241];
const BRAND_COLOR: [number, number, number] = [79, 70, 229];

export type ReportPdfFilters = {
  periodLabel: string;
  dateModeLabel: string;
  name: string;
  department: string;
  mealTypeLabel: string;
};

type CapturedImage = {
  dataUrl: string;
  pixelWidth: number;
  pixelHeight: number;
};

function loadImageDimensions(dataUrl: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve({ width: image.naturalWidth, height: image.naturalHeight });
    image.onerror = () => reject(new Error("Failed to load captured image."));
    image.src = dataUrl;
  });
}

async function captureElement(element: HTMLElement): Promise<CapturedImage> {
  try {
    const dataUrl = await toPng(element, {
      backgroundColor: "#ffffff",
      pixelRatio: 2,
    });

    const dimensions = await loadImageDimensions(dataUrl);

    return {
      dataUrl,
      pixelWidth: dimensions.width,
      pixelHeight: dimensions.height,
    };
  } catch (error) {
    console.error("PDF Generation Error:", error);
    throw error;
  }
}

function fitImageDimensions(
  pixelWidth: number,
  pixelHeight: number,
  maxWidth: number,
  maxHeight: number,
): { width: number; height: number } {
  const ratio = pixelHeight / pixelWidth;
  let width = maxWidth;
  let height = width * ratio;

  if (height > maxHeight) {
    height = maxHeight;
    width = height / ratio;
  }

  return { width, height };
}

function getPageMetrics(doc: jsPDF) {
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const contentWidth = pageWidth - PDF_MARGIN * 2;

  return { pageWidth, pageHeight, contentWidth };
}

function ensureVerticalSpace(doc: jsPDF, currentY: number, neededHeight: number): number {
  const { pageHeight } = getPageMetrics(doc);

  if (currentY + neededHeight > pageHeight - PDF_MARGIN) {
    doc.addPage();
    return PDF_MARGIN;
  }

  return currentY;
}

function drawPdfHeader(doc: jsPDF, filters: ReportPdfFilters, generatedAt: string): number {
  const { pageWidth, contentWidth } = getPageMetrics(doc);
  let y = PDF_MARGIN;

  doc.setFillColor(...BRAND_COLOR);
  doc.rect(0, 0, pageWidth, 28, "F");

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(20);
  doc.setFont("helvetica", "bold");
  doc.text("MealQuota", PDF_MARGIN, 12);

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text("Enterprise Meal Quota Management", PDF_MARGIN, 19);

  doc.setFontSize(9);
  doc.text(`Exported: ${generatedAt}`, pageWidth - PDF_MARGIN, 12, { align: "right" });
  doc.text("Confidential — HRD Internal Use", pageWidth - PDF_MARGIN, 19, { align: "right" });

  y = 38;
  doc.setTextColor(30, 41, 59);
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.text("Meal Analytics Report", PDF_MARGIN, y);

  y += 8;
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(71, 85, 105);
  doc.text("Comprehensive overview of meal redemptions, distribution, and departmental usage.", PDF_MARGIN, y);

  y += 10;
  doc.setDrawColor(226, 232, 240);
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(PDF_MARGIN, y, contentWidth, 28, 2, 2, "FD");

  doc.setFontSize(9);
  doc.setTextColor(51, 65, 85);
  const filterLines = [
    `Date Range: ${filters.periodLabel} (${filters.dateModeLabel})`,
    `Employee: ${filters.name || "All employees"}`,
    `Department: ${filters.department || "All departments"}`,
    `Meal Type: ${filters.mealTypeLabel}`,
  ];

  filterLines.forEach((line, index) => {
    doc.text(line, PDF_MARGIN + 4, y + 8 + index * 6);
  });

  return y + 36;
}

function drawSectionTitle(doc: jsPDF, title: string, y: number): number {
  const { contentWidth } = getPageMetrics(doc);

  y = ensureVerticalSpace(doc, y, 12);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(30, 41, 59);
  doc.text(title, PDF_MARGIN, y);

  y += 3;
  doc.setDrawColor(...HEADER_COLOR);
  doc.setLineWidth(0.6);
  doc.line(PDF_MARGIN, y, PDF_MARGIN + contentWidth, y);

  return y + 6;
}

async function addCapturedSection(
  doc: jsPDF,
  title: string,
  element: HTMLElement,
  startY: number,
): Promise<number> {
  let y = drawSectionTitle(doc, title, startY);
  const captured = await captureElement(element);
  const dimensions = await loadImageDimensions(captured.dataUrl);
  const { pageHeight, contentWidth } = getPageMetrics(doc);

  const maxHeight = pageHeight - PDF_MARGIN - y;
  const fitted = fitImageDimensions(dimensions.width, dimensions.height, contentWidth, maxHeight);

  y = ensureVerticalSpace(doc, y, fitted.height + 4);

  if (y === PDF_MARGIN) {
    y = drawSectionTitle(doc, title, y);
  }

  const finalMaxHeight = pageHeight - PDF_MARGIN - y;
  const finalFit = fitImageDimensions(dimensions.width, dimensions.height, contentWidth, finalMaxHeight);

  doc.addImage(captured.dataUrl, "PNG", PDF_MARGIN, y, finalFit.width, finalFit.height);

  return y + finalFit.height + 8;
}

export type GenerateReportPdfParams = {
  report: ReportResponse;
  filters: ReportPdfFilters;
  summaryElement: HTMLElement;
  chartsElement: HTMLElement;
  fileName: string;
};

export async function generateReportPdf({
  report,
  filters,
  summaryElement,
  chartsElement,
  fileName,
}: GenerateReportPdfParams): Promise<void> {
  try {
    const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
    const generatedAt = new Date().toLocaleString();

    let cursorY = drawPdfHeader(doc, filters, generatedAt);

    cursorY = await addCapturedSection(doc, "Executive Summary", summaryElement, cursorY);
    cursorY = await addCapturedSection(doc, "Visual Analytics", chartsElement, cursorY);

    cursorY = drawSectionTitle(doc, "Meal Log Details", cursorY);

    autoTable(doc, {
      startY: cursorY,
      head: [["#", "Employee Name", "Department", "Date", "Time", "Meal Type"]],
      body: report.data.map((row, index) => [
        String(index + 1),
        row.name,
        row.department,
        row.meal_date,
        row.served_at,
        MEAL_TYPE_LABELS[row.meal_type],
      ]),
      theme: "striped",
      styles: {
        fontSize: 8,
        cellPadding: 2.5,
        lineColor: [226, 232, 240],
        lineWidth: 0.1,
        textColor: [51, 65, 85],
      },
      headStyles: {
        fillColor: HEADER_COLOR,
        textColor: 255,
        fontStyle: "bold",
        halign: "left",
      },
      alternateRowStyles: {
        fillColor: [248, 250, 252],
      },
      columnStyles: {
        0: { cellWidth: 10, halign: "center" },
        1: { cellWidth: 38 },
        2: { cellWidth: 32 },
        3: { cellWidth: 24 },
        4: { cellWidth: 20 },
        5: { cellWidth: 26 },
      },
      margin: { left: PDF_MARGIN, right: PDF_MARGIN },
      didDrawPage: (data) => {
        const { pageWidth, pageHeight } = getPageMetrics(doc);
        const pageCount = doc.getNumberOfPages();

        doc.setFontSize(8);
        doc.setTextColor(148, 163, 184);
        doc.text(
          `MealQuota Analytics Report — Page ${data.pageNumber} of ${pageCount}`,
          pageWidth / 2,
          pageHeight - 6,
          { align: "center" },
        );
      },
    });

    doc.save(fileName);
  } catch (error) {
    console.error("PDF Generation Error:", error);
    throw error;
  }
}
