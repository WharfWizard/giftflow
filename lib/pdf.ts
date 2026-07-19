"use client";

// PDF generation for the IHT403-style evidence pack.
//
// Two rules this file exists to enforce:
//
// 1. Every row's height is computed from its wrapped text BEFORE anything
//    is drawn, never assumed. A long recipient name or note gets as many
//    lines as it needs; nothing is ever silently clipped.
//
// 2. Only print-safe characters reach the page. jsPDF's standard fonts
//    (Helvetica) support the WinAnsi encoding — GBP, ordinary hyphens,
//    ordinary punctuation — but not arrows, checkmarks, or the Unicode
//    minus sign used on screen. This module has its own vocabulary,
//    entirely separate from what the UI components use.

import jsPDF from "jspdf";
import { GiftFlowRecord, Gift, ExemptionPathway, expenditureShareFor } from "./types";

const PAGE_MARGIN = 15;
const PAGE_WIDTH = 210; // A4 mm
const PAGE_HEIGHT = 297;
const CONTENT_WIDTH = PAGE_WIDTH - PAGE_MARGIN * 2;
const LINE_HEIGHT = 4.2;
const ROW_PADDING = 2;
const FONT_SIZE_BODY = 9;
const FONT_SIZE_HEADING = 12;
const FONT_SIZE_SMALL = 7.5;

const PATHWAY_LABEL: Record<ExemptionPathway, string> = {
  spouse: "Spouse exemption",
  annual_exemption: "Annual exemption",
  small_gifts: "Small gifts",
  normal_expenditure_income: "Normal expenditure from income",
  PET: "Potentially exempt transfer",
};

const INCOME_CATEGORIES = ["salary", "pensions", "interest", "investments", "rents", "annuities", "other"] as const;
const INCOME_CATEGORY_LABEL: Record<string, string> = {
  salary: "Salary",
  pensions: "Pensions",
  interest: "Interest (incl. PEPs and ISAs)",
  investments: "Investments",
  rents: "Rents",
  annuities: "Annuities (income element)",
  other: "Other",
};
const EXPENDITURE_CATEGORIES = [
  "Mortgages", "Insurance", "Household bills", "Council Tax", "Travelling costs",
  "Entertainment", "Holidays", "Nursing home fees", "Other",
];

// Strips anything outside the safe printable range this document relies
// on. GBP and standard punctuation pass through; emoji, arrows, curly
// quotes, and the Unicode minus sign do not.
function safeText(input: string): string {
  return input
    .replace(/[\u2212]/g, "-")
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[\u2013\u2014]/g, "-")
    .replace(/[^\x20-\x7E\u00A3]/g, ""); // keep printable ASCII plus GBP sign
}

function money(n: number): string {
  const sign = n < 0 ? "-" : "";
  return `${sign}£${Math.abs(Math.round(n)).toLocaleString()}`;
}

interface Column {
  header: string;
  width: number;
  align?: "left" | "right";
}

class PdfBuilder {
  doc: jsPDF;
  y: number;
  pageNumber = 1;

  constructor() {
    this.doc = new jsPDF({ unit: "mm", format: "a4" });
    this.y = PAGE_MARGIN;
    this.doc.setFont("helvetica", "normal");
  }

  private ensureSpace(needed: number) {
    if (this.y + needed > PAGE_HEIGHT - PAGE_MARGIN) {
      this.doc.addPage();
      this.pageNumber++;
      this.y = PAGE_MARGIN;
    }
  }

  heading(text: string) {
    this.ensureSpace(10);
    this.doc.setFontSize(FONT_SIZE_HEADING);
    this.doc.setFont("helvetica", "bold");
    this.doc.text(safeText(text), PAGE_MARGIN, this.y);
    this.y += 7;
    this.doc.setFont("helvetica", "normal");
  }

  subheading(text: string) {
    this.ensureSpace(7);
    this.doc.setFontSize(FONT_SIZE_BODY);
    this.doc.setFont("helvetica", "bold");
    this.doc.text(safeText(text), PAGE_MARGIN, this.y);
    this.y += 5.5;
    this.doc.setFont("helvetica", "normal");
  }

  paragraph(text: string, opts?: { small?: boolean }) {
    const size = opts?.small ? FONT_SIZE_SMALL : FONT_SIZE_BODY;
    this.doc.setFontSize(size);
    const lines: string[] = this.doc.splitTextToSize(safeText(text), CONTENT_WIDTH);
    const height = lines.length * LINE_HEIGHT;
    this.ensureSpace(height);
    this.doc.text(lines, PAGE_MARGIN, this.y);
    this.y += height + 2;
  }

  spacer(mm: number) {
    this.y += mm;
  }

  // The core of the "measure before drawing" rule. Every cell's text is
  // wrapped to its column width first; the row height is the tallest
  // wrapped cell. Only once that's known does anything get drawn.
  table(columns: Column[], rows: string[][], opts?: { boldRows?: number[]; topBorderRows?: number[] }) {
    this.doc.setFontSize(FONT_SIZE_BODY);

    const drawHeader = () => {
      this.doc.setFont("helvetica", "bold");
      let x = PAGE_MARGIN;
      columns.forEach((col) => {
        const textX = col.align === "right" ? x + col.width : x;
        this.doc.text(safeText(col.header), textX, this.y, { align: col.align ?? "left" });
        x += col.width;
      });
      this.y += 5;
      this.doc.setDrawColor(180, 180, 180);
      this.doc.line(PAGE_MARGIN, this.y - 3.5, PAGE_MARGIN + CONTENT_WIDTH, this.y - 3.5);
      this.doc.setFont("helvetica", "normal");
    };

    drawHeader();

    rows.forEach((row, rowIndex) => {
      // Measure every cell in this row against its column width.
      const wrapped = row.map((cell, i) => this.doc.splitTextToSize(safeText(cell), columns[i].width - 2));
      const rowLines = Math.max(...wrapped.map((w: string[]) => w.length), 1);
      const rowHeight = rowLines * LINE_HEIGHT + ROW_PADDING;

      // Page-break check happens with full knowledge of the row's real
      // height, not a guess — this is the step that prevents a tall row
      // being split awkwardly across a page boundary.
      if (this.y + rowHeight > PAGE_HEIGHT - PAGE_MARGIN) {
        this.doc.addPage();
        this.pageNumber++;
        this.y = PAGE_MARGIN;
        drawHeader();
      }

      if (opts?.topBorderRows?.includes(rowIndex)) {
        this.doc.setDrawColor(150, 150, 150);
        this.doc.line(PAGE_MARGIN, this.y - 2.5, PAGE_MARGIN + CONTENT_WIDTH, this.y - 2.5);
      }

      const isBold = opts?.boldRows?.includes(rowIndex);
      this.doc.setFont("helvetica", isBold ? "bold" : "normal");

      let x = PAGE_MARGIN;
      columns.forEach((col, i) => {
        const textX = col.align === "right" ? x + col.width : x;
        this.doc.text(wrapped[i], textX, this.y, { align: col.align ?? "left" });
        x += col.width;
      });

      this.y += rowHeight;
    });

    this.doc.setFont("helvetica", "normal");
    this.spacer(3);
  }

  finish(): jsPDF {
    const totalPages = this.pageNumber;
    for (let p = 1; p <= totalPages; p++) {
      this.doc.setPage(p);
      this.doc.setFontSize(FONT_SIZE_SMALL);
      this.doc.setTextColor(120, 120, 120);
      this.doc.text(
        safeText(`GiftFlow evidence pack - not a tax calculation - page ${p} of ${totalPages}`),
        PAGE_MARGIN,
        PAGE_HEIGHT - 10
      );
      this.doc.setTextColor(0, 0, 0);
    }
    return this.doc;
  }
}

export function generateEvidencePack(record: GiftFlowRecord, personId: string): jsPDF {
  const b = new PdfBuilder();
  const person = record.household.people.find((p) => p.id === personId);
  const personName = person?.fullName ?? "this person";

  b.heading("GiftFlow Evidence Pack");
  b.paragraph(`Prepared for ${personName}, generated ${new Date().toLocaleDateString("en-GB")}.`);
  b.paragraph(
    "This document organises information and evidence for this person's own history. Where a gift or figure was shared with someone else in the household, only this person's share is shown here — a separate evidence pack should be prepared for anyone else in the household, using their own income, expenditure and share of any joint gifts. This document does not determine tax liability, does not apply taper relief, and does not decide whether any gift qualifies for an exemption.",
    { small: true }
  );
  b.spacer(3);

  // Estate screening summary
  b.subheading("Estate screening");
  const s = record.screening;
  const answerLabel = (v: string | null) => (v === "yes" ? "Yes" : v === "no" ? "No" : v === "not_sure" ? "Not sure yet" : "Not answered");
  b.table(
    [
      { header: "Question", width: 140 },
      { header: "Answer", width: 40, align: "right" },
    ],
    [
      ["Gifts or transfers made", answerLabel(s.q1_giftsOrTransfers)],
      ["Created a trust or settlement", answerLabel(s.q2_createdTrust)],
      ["Added to an existing trust", answerLabel(s.q3_addedToTrust)],
      ["Paid a life assurance premium for another person", answerLabel(s.q4_lifeAssurancePremium)],
      ["Benefited from a trust that ended during their lifetime", answerLabel(s.q5_trustBenefitEnded)],
      ["Claiming gifts as exempt out of income", answerLabel(s.q6_claimingIncomeExemption)],
    ]
  );

  // Full gift history — every gift, regardless of tax year or status.
  // Never filtered down to "the current year" — see spec section on the
  // print generation rule this corrects.
  b.subheading("Gifts, full history (box 7)");
  b.paragraph(
    personName ? `Values shown are ${personName}'s share only, where a gift was made jointly.` : "Values shown reflect this person's share only, where a gift was made jointly.",
    { small: true }
  );
  const shareOf = (g: Gift) => {
    const split = g.donorSplits.find((sp) => sp.personId === personId);
    // A person with no recorded share of a gift has none — defaulting to
    // a full share here would have overstated gifts they weren't party to.
    return g.confirmedTotal * ((split?.sharePercent ?? 0) / 100);
  };
  const isDonorOn = (g: Gift) => g.donorSplits.some((sp) => sp.personId === personId);
  const sortedGifts = record.gifts
    .filter((g) => isDonorOn(g))
    .sort((a, b2) => (a.taxYear < b2.taxYear ? -1 : 1));
  if (sortedGifts.length === 0) {
    b.paragraph("No gifts recorded for this person.");
  } else {
    b.table(
      [
        { header: "Tax year", width: 22 },
        { header: "Recipient", width: 45 },
        { header: "Pathway", width: 55 },
        { header: "Value", width: 28, align: "right" },
        { header: "Status", width: 30, align: "right" },
      ],
      sortedGifts.map((g) => [
        g.taxYear,
        g.recipientName,
        PATHWAY_LABEL[g.exemptionPathway],
        money(shareOf(g)),
        g.reviewStatus === "voided" ? "Voided" : g.reviewStatus === "needs_review" ? "Needs review" : g.reviewStatus === "planned" ? "Planned" : "Confirmed",
      ])
    );
    const unresolved = sortedGifts.filter((g) => g.notes && g.reviewStatus === "needs_review");
    if (unresolved.length > 0) {
      b.subheading("Unresolved items");
      unresolved.forEach((g) => {
        b.paragraph(`${g.recipientName}, ${g.taxYear}: ${g.notes!.split("\n")[0]}`, { small: true });
      });
    }
  }

  // Potentially exempt transfers, years elapsed only — no taper relief,
  // no liability figure. See spec's explicit boundary on this.
  const petGifts = record.gifts.filter((g) => g.exemptionPathway === "PET" && g.reviewStatus !== "voided" && isDonorOn(g));
  if (petGifts.length > 0) {
    b.subheading("Potentially exempt transfers");
    b.paragraph(
      "Years elapsed since each gift. Taper relief and any tax due are calculated by HMRC after death, using figures this record does not hold." +
        (personName ? ` Values shown are ${personName}'s share only, where a gift was made jointly.` : ""),
      { small: true }
    );
    const now = new Date();
    const petRows = petGifts.map((g) => {
      const startYear = parseInt(g.taxYear.split("/")[0], 10);
      const refDate = g.giftDate ? new Date(g.giftDate) : new Date(startYear, 3, 6);
      const years = (now.getTime() - refDate.getTime()) / (1000 * 60 * 60 * 24 * 365.25);
      const status = years >= 7 ? "Clear of estate" : years >= 3 ? "Past 3 years" : "Within 3 years";
      return [g.recipientName, g.taxYear, money(shareOf(g)), years.toFixed(1), status];
    });
    b.table(
      [
        { header: "Recipient", width: 45 },
        { header: "Tax year", width: 25 },
        { header: "Value", width: 30, align: "right" },
        { header: "Years", width: 20, align: "right" },
        { header: "Status", width: 30, align: "right" },
      ],
      petRows
    );
  }

  // Box 20 to 22 — one per tax year that has a gift claimed as normal
  // expenditure from income *by this person*. Never just "the current year,"
  // and never a year that's only relevant to someone else in the household.
  const qualifyingYears = Array.from(
    new Set(
      record.gifts
        .filter((g) => g.exemptionPathway === "normal_expenditure_income" && g.reviewStatus !== "voided" && isDonorOn(g))
        .map((g) => g.taxYear)
    )
  ).sort();

  qualifyingYears.forEach((taxYear) => {
    b.subheading(`Box 20 to 22, tax year ${taxYear}`);
    b.paragraph(
      `Income and expenditure shown are ${personName}'s own, not the household's combined figures. Joint household expenses are apportioned according to the split recorded for each item.`,
      { small: true }
    );
    const yearIncome = record.income.filter((i) => i.taxYear === taxYear && i.personId === personId);
    const yearExpenditure = record.expenditure.filter((e) => e.taxYear === taxYear && e.personIds.includes(personId));

    const grossByCategory = INCOME_CATEGORIES.map((cat) => ({
      label: INCOME_CATEGORY_LABEL[cat],
      amount: yearIncome.filter((i) => i.category === cat).reduce((sum, i) => sum + i.grossAmount, 0),
    }));
    const grossTotal = grossByCategory.reduce((s, g) => s + g.amount, 0);
    const taxTotal = yearIncome.reduce((s, i) => s + (i.taxAttributable ?? i.taxDeducted ?? 0), 0);
    const netIncome = grossTotal - taxTotal;

    const expByCategory = EXPENDITURE_CATEGORIES.map((cat) => ({
      label: cat,
      amount: yearExpenditure
        .filter((e) => e.iht403Category === cat)
        .reduce((sum, e) => sum + expenditureShareFor(e, personId, record.household), 0),
    }));
    const expTotal = expByCategory.reduce((s, e) => s + e.amount, 0);
    const surplus = netIncome - expTotal;

    const giftsFromIncome = record.gifts
      .filter((g) => g.taxYear === taxYear && g.exemptionPathway === "normal_expenditure_income" && g.reviewStatus !== "voided")
      .reduce((s, g) => s + shareOf(g), 0);

    const incomeRows = grossByCategory.map((g) => [g.label, money(g.amount)]);
    incomeRows.push(["Minus Income Tax paid", money(-taxTotal)]);
    incomeRows.push(["Net income", money(netIncome)]);

    b.table(
      [
        { header: "Income", width: 130 },
        { header: "Amount", width: 40, align: "right" },
      ],
      incomeRows,
      { boldRows: [incomeRows.length - 1], topBorderRows: [incomeRows.length - 1] }
    );

    const expRows = expByCategory.map((e) => [e.label, money(e.amount)]);
    expRows.push(["Total expenditure", money(expTotal)]);

    b.table(
      [
        { header: "Expenditure", width: 130 },
        { header: "Amount", width: 40, align: "right" },
      ],
      expRows,
      { boldRows: [expRows.length - 1], topBorderRows: [expRows.length - 1] }
    );

    b.table(
      [
        { header: "Summary", width: 130 },
        { header: "Amount", width: 40, align: "right" },
      ],
      [
        ["Surplus (deficit) income for the year", money(surplus)],
        [`Gifts made, claimed as normal expenditure from income (${personName}'s share)`, money(giftsFromIncome)],
      ],
      { boldRows: [0] }
    );
  });

  return b.finish();
}

export function downloadEvidencePack(record: GiftFlowRecord, personId: string) {
  const doc = generateEvidencePack(record, personId);
  const person = record.household.people.find((p) => p.id === personId);
  const filename = person ? `giftflow-evidence-${person.fullName.replace(/\s+/g, "-").toLowerCase()}.pdf` : "giftflow-evidence.pdf";
  doc.save(filename);
}
